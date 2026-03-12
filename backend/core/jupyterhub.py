import httpx
from core.config import settings

HUB_API = f"{settings.jupyterhub_url}/hub/api"
HEADERS = {"Authorization": f"token {settings.jupyterhub_api_token}"}


async def ensure_server(username: str) -> bool:
    """Start a user's single-user server if not already running."""
    async with httpx.AsyncClient() as client:
        # Check if server is already running
        r = await client.get(f"{HUB_API}/users/{username}", headers=HEADERS)
        r.raise_for_status()
        user = r.json()
        if user.get("server"):
            return True

        # Start the server
        r = await client.post(
            f"{HUB_API}/users/{username}/server", headers=HEADERS
        )
        return r.status_code in (201, 202)


async def get_user_token(username: str) -> str:
    """Generate a short-lived API token for a user's server."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{HUB_API}/users/{username}/tokens",
            headers=HEADERS,
            json={"expires_in": 3600},
        )
        r.raise_for_status()
        return r.json()["token"]


async def list_kernels(username: str, user_token: str) -> list[dict]:
    """List running kernels for a user's server."""
    server_url = f"{settings.jupyterhub_url}/user/{username}"
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{server_url}/api/kernels",
            headers={"Authorization": f"token {user_token}"},
        )
        r.raise_for_status()
        return r.json()


async def start_kernel(username: str, user_token: str, kernel_name: str = "python3") -> dict:
    """Start a new kernel on the user's server."""
    server_url = f"{settings.jupyterhub_url}/user/{username}"
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{server_url}/api/kernels",
            headers={"Authorization": f"token {user_token}"},
            json={"name": kernel_name},
        )
        r.raise_for_status()
        return r.json()


def kernel_ws_url(username: str, kernel_id: str, user_token: str) -> str:
    """Build the WebSocket URL for a kernel's channels endpoint."""
    base = settings.jupyterhub_url.replace("http://", "ws://").replace("https://", "wss://")
    return f"{base}/user/{username}/api/kernels/{kernel_id}/channels?token={user_token}"


async def interrupt_kernel(username: str, user_token: str, kernel_id: str) -> None:
    """Send an interrupt signal to a running kernel."""
    server_url = f"{settings.jupyterhub_url}/user/{username}"
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{server_url}/api/kernels/{kernel_id}/interrupt",
            headers={"Authorization": f"token {user_token}"},
        )
        r.raise_for_status()
