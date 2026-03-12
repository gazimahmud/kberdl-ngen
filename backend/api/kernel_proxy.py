"""
Kernel WebSocket proxy.

Flow:
  Browser  ──WS──►  BFF /api/kernels/{tenant}/{kernel_id}/channels
                         │
                         └──WS──►  JupyterHub /user/{username}/api/kernels/{kernel_id}/channels

The BFF:
  1. Validates the user's auth token
  2. Ensures the user's JupyterHub server is running
  3. Obtains a short-lived JupyterHub user token
  4. Opens a WebSocket to the kernel and bidirectionally proxies messages
"""
import asyncio
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from core.config import settings
from core import jupyterhub

router = APIRouter(prefix="/kernels", tags=["kernels"])


async def _decode_token(token: str):
    payload = jwt.decode(token, settings.auth_secret_key, algorithms=[settings.auth_algorithm])
    username = payload.get("sub")
    tenants = payload.get("tenants", [])
    if not username:
        raise ValueError("Invalid token")
    return username, tenants


@router.get("/{tenant}")
async def list_kernels(tenant: str, token: str = Query(...)):
    """List running kernels for the user on a given tenant server."""
    try:
        username, tenants = await _decode_token(token)
    except (JWTError, ValueError):
        return {"error": "Unauthorized"}, 401
    if tenant not in tenants:
        return {"error": "Forbidden"}, 403

    await jupyterhub.ensure_server(username)
    user_token = await jupyterhub.get_user_token(username)
    kernels = await jupyterhub.list_kernels(username, user_token)
    return {"kernels": kernels}


@router.post("/{tenant}/start")
async def start_kernel(tenant: str, token: str = Query(...), kernel_name: str = "python3"):
    """Start a new kernel for the user."""
    try:
        username, tenants = await _decode_token(token)
    except (JWTError, ValueError):
        return {"error": "Unauthorized"}, 401
    if tenant not in tenants:
        return {"error": "Forbidden"}, 403

    await jupyterhub.ensure_server(username)
    user_token = await jupyterhub.get_user_token(username)
    kernel = await jupyterhub.start_kernel(username, user_token, kernel_name)
    return {"kernel_id": kernel["id"], "kernel_name": kernel["name"]}


@router.post("/{tenant}/{kernel_id}/interrupt")
async def interrupt_kernel(tenant: str, kernel_id: str, token: str = Query(...)):
    """Send an interrupt signal to a running kernel."""
    try:
        username, tenants = await _decode_token(token)
    except (JWTError, ValueError):
        return {"error": "Unauthorized"}, 401
    if tenant not in tenants:
        return {"error": "Forbidden"}, 403

    user_token = await jupyterhub.get_user_token(username)
    await jupyterhub.interrupt_kernel(username, user_token, kernel_id)
    return {"status": "ok"}


@router.websocket("/{tenant}/{kernel_id}/channels")
async def kernel_channels(
    websocket: WebSocket,
    tenant: str,
    kernel_id: str,
    token: str = Query(...),
):
    """
    Bidirectional WebSocket proxy between the browser and the Jupyter kernel.
    The browser connects here; we forward all messages to/from the real kernel.
    """
    # Validate auth token
    try:
        username, tenants = await _decode_token(token)
    except (JWTError, ValueError):
        await websocket.close(code=4001)
        return

    if tenant not in tenants:
        await websocket.close(code=4003)
        return

    await websocket.accept()

    # Ensure JupyterHub server is running and get a user token
    try:
        await jupyterhub.ensure_server(username)
        user_token = await jupyterhub.get_user_token(username)
    except Exception:
        await websocket.close(code=1011)
        return

    kernel_ws_url = jupyterhub.kernel_ws_url(username, kernel_id, user_token)

    try:
        async with websockets.connect(kernel_ws_url) as kernel_ws:
            async def browser_to_kernel():
                try:
                    while True:
                        msg = await websocket.receive_text()
                        await kernel_ws.send(msg)
                except (WebSocketDisconnect, Exception):
                    pass

            async def kernel_to_browser():
                try:
                    async for msg in kernel_ws:
                        await websocket.send_text(msg if isinstance(msg, str) else msg.decode())
                except Exception:
                    pass

            await asyncio.gather(browser_to_kernel(), kernel_to_browser())

    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
