"""SQL Console — executes SparkSQL on the user's JupyterHub kernel.

Flow:
  1. Decode Bearer JWT → username, tenants
  2. Ensure JupyterHub server is running
  3. Get or start a kernel
  4. Execute SQL-wrapping Python code via Jupyter WebSocket (channels) protocol
  5. Parse stdout for JSON result and return

The execute_request/stream/execute_reply message cycle follows the
Jupyter Messaging Protocol v5.3.  The /api/kernels/{id}/channels
WebSocket multiplexes all channels into one connection.
"""

import asyncio
import datetime
import json
import time
import uuid
import websockets
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel

from core import jupyterhub
from core.config import settings

router = APIRouter(prefix="/sql", tags=["sql"])


# ── Auth ──────────────────────────────────────────────────────────────────────

def _decode_auth(authorization: str | None) -> tuple[str, list[str]]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization[7:]
    try:
        payload = jwt.decode(
            token, settings.auth_secret_key, algorithms=[settings.auth_algorithm]
        )
        username: str = payload.get("sub", "")
        tenants: list[str] = payload.get("tenants", [])
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject")
        return username, tenants
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc


# ── Kernel lifecycle ──────────────────────────────────────────────────────────

async def _get_or_start_kernel(username: str, user_token: str) -> str:
    """Return an existing kernel id or start a new kernel."""
    kernels = await jupyterhub.list_kernels(username, user_token)
    if kernels:
        return kernels[0]["id"]
    kernel = await jupyterhub.start_kernel(username, user_token, "python3")
    # Allow the kernel process a moment to initialise
    await asyncio.sleep(2.0)
    return kernel["id"]


# ── Jupyter Messaging Protocol helpers ───────────────────────────────────────

def _build_execute_request(code: str) -> tuple[str, dict]:
    """Return (msg_id, message_dict) for an execute_request."""
    msg_id = uuid.uuid4().hex
    msg = {
        "header": {
            "msg_id": msg_id,
            "username": "kberdl-sql",
            "session": uuid.uuid4().hex,
            "date": datetime.datetime.utcnow().isoformat() + "Z",
            "msg_type": "execute_request",
            "version": "5.3",
        },
        "parent_header": {},
        "metadata": {},
        "content": {
            "code": code,
            "silent": False,
            "store_history": False,
            "user_expressions": {},
            "allow_stdin": False,
            "stop_on_error": True,
        },
        "buffers": [],
        "channel": "shell",
    }
    return msg_id, msg


async def _run_on_kernel(
    ws_url: str,
    code: str,
    chunk_callback=None,
    timeout: float = 120.0,
) -> str:
    """
    Open a WebSocket to the kernel, send *code*, and collect stdout.

    Optional *chunk_callback(text: str)* is called with each stdout fragment
    as it arrives (useful for streaming endpoints).

    Returns all stdout concatenated.
    Raises RuntimeError on kernel execution error.
    """
    msg_id, request = _build_execute_request(code)
    parts: list[str] = []

    async def _collect():
        async with websockets.connect(ws_url) as ws:
            await ws.send(json.dumps(request))
            async for raw in ws:
                if isinstance(raw, bytes):
                    raw = raw.decode()
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                if msg.get("parent_header", {}).get("msg_id") != msg_id:
                    continue

                mtype = msg.get("msg_type", "")
                content = msg.get("content", {})

                if mtype == "stream" and content.get("name") == "stdout":
                    text = content.get("text", "")
                    parts.append(text)
                    if chunk_callback:
                        chunk_callback(text)

                elif mtype == "error":
                    ename = content.get("ename", "Error")
                    evalue = content.get("evalue", "")
                    raise RuntimeError(f"{ename}: {evalue}")

                elif mtype == "execute_reply":
                    if content.get("status") == "error":
                        raise RuntimeError(content.get("evalue", "Kernel execution error"))
                    return  # done — exit the async for

    await asyncio.wait_for(_collect(), timeout=timeout)
    return "".join(parts)


# ── SparkSQL code generation ──────────────────────────────────────────────────

def _build_spark_sql_code(query: str) -> str:
    """
    Wrap a SparkSQL statement in Python that prints a JSON result to stdout.
    json.dumps ensures the query string is safe regardless of quoting.
    """
    safe = json.dumps(query)
    return (
        "import json as __j\n"
        f"__df = spark.sql({safe})\n"
        "__cols = __df.columns\n"
        "__rows = [\n"
        "    [str(v) if v is not None else None for v in row]\n"
        "    for row in __df.collect()\n"
        "]\n"
        'print(__j.dumps({"columns": __cols, "rows": __rows}))\n'
    )


def _parse_result(raw: str) -> dict:
    """
    Scan stdout lines bottom-up for a JSON object with 'columns' and 'rows'.
    """
    for line in reversed(raw.splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            if isinstance(obj, dict) and "columns" in obj and "rows" in obj:
                return obj
        except json.JSONDecodeError:
            continue
    raise ValueError(f"No result JSON found in kernel output:\n{raw[:2000]}")


# ── Pydantic models ───────────────────────────────────────────────────────────

class SQLRequest(BaseModel):
    query: str


class SQLResult(BaseModel):
    columns: list[str]
    rows: list[list[str | None]]
    elapsed_ms: float


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/{tenant}/execute", response_model=SQLResult)
async def execute_sql(
    tenant: str,
    body: SQLRequest,
    authorization: str | None = Header(default=None),
):
    """Execute a SparkSQL query on the user's JupyterHub kernel and return results."""
    username, tenants = _decode_auth(authorization)
    if tenant not in tenants:
        raise HTTPException(status_code=403, detail="Access denied for this tenant")

    # JupyterHub lifecycle — surface connectivity problems clearly
    try:
        await jupyterhub.ensure_server(username)
        user_token = await jupyterhub.get_user_token(username)
        kernel_id = await _get_or_start_kernel(username, user_token)
        ws_url = jupyterhub.kernel_ws_url(username, kernel_id, user_token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"JupyterHub unavailable: {type(exc).__name__}: {exc}",
        ) from exc

    # Kernel execution
    code = _build_spark_sql_code(body.query)
    t0 = time.monotonic()
    try:
        raw = await _run_on_kernel(ws_url, code)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Query timed out (> 120 s)") from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Kernel WebSocket error: {type(exc).__name__}: {exc}",
        ) from exc

    elapsed_ms = (time.monotonic() - t0) * 1000

    try:
        result = _parse_result(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return SQLResult(
        columns=result["columns"],
        rows=result["rows"],
        elapsed_ms=round(elapsed_ms, 1),
    )


@router.post("/{tenant}/stream")
async def stream_sql(
    tenant: str,
    body: SQLRequest,
    authorization: str | None = Header(default=None),
):
    """
    Execute a SparkSQL query and stream the result as a Server-Sent Event.
    Yields a single 'data:' event containing a JSON result or error object,
    followed by 'data: [DONE]'.
    """
    username, tenants = _decode_auth(authorization)
    if tenant not in tenants:
        raise HTTPException(status_code=403, detail="Access denied for this tenant")

    try:
        await jupyterhub.ensure_server(username)
        user_token = await jupyterhub.get_user_token(username)
        kernel_id = await _get_or_start_kernel(username, user_token)
        ws_url = jupyterhub.kernel_ws_url(username, kernel_id, user_token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"JupyterHub unavailable: {type(exc).__name__}: {exc}",
        ) from exc

    code = _build_spark_sql_code(body.query)

    async def _generate():
        t0 = time.monotonic()
        try:
            raw = await _run_on_kernel(ws_url, code)
            elapsed_ms = (time.monotonic() - t0) * 1000
            result = _parse_result(raw)
            payload = json.dumps({
                "type": "result",
                "columns": result["columns"],
                "rows": result["rows"],
                "elapsed_ms": round(elapsed_ms, 1),
            })
            yield f"data: {payload}\n\n"
        except Exception as exc:
            payload = json.dumps({"type": "error", "message": str(exc)})
            yield f"data: {payload}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
