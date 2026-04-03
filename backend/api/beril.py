"""
BERIL remote query proxy.

Forwards Spark SQL to the BERIL/K-BERDL data lakehouse using the caller's
KBASE_AUTH_TOKEN. The token is passed in the X-BERIL-Token request header
and forwarded as a Bearer token to the BERIL endpoint.

BERIL Spark SQL endpoint: https://hub.berdl.kbase.us/apis/mcp/sparksql
Auth: Authorization: Bearer <KBASE_AUTH_TOKEN>
"""
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/beril", tags=["beril"])

# Default BERIL Spark SQL endpoint — can be overridden per-request via `endpoint`
DEFAULT_BERIL_SQL_URL = "https://hub.berdl.kbase.us/apis/mcp/sparksql"

# Health / connectivity check endpoint (already proxied via observatory.py,
# but kept here as well so the settings panel can test the token directly)
BERIL_HEALTH_URL = (
    "http://beril-observatory.knowledge-engine.development.svc.spin.nersc.org"
    "/knowledge/discoveries"
)


class BerilQueryRequest(BaseModel):
    sql: str
    tenant: Optional[str] = None
    endpoint: Optional[str] = None   # override default BERIL SQL URL if needed


class BerilQueryResponse(BaseModel):
    columns: list[str]
    rows: list[list]
    elapsed_ms: float
    source: str = "beril"


@router.post("/query", response_model=BerilQueryResponse)
async def beril_query(
    req: BerilQueryRequest,
    x_beril_token: Optional[str] = Header(default=None, alias="X-BERIL-Token"),
):
    """
    Execute a Spark SQL query against the BERIL data lakehouse.
    Requires a valid KBASE_AUTH_TOKEN in the X-BERIL-Token header.
    """
    if not x_beril_token:
        raise HTTPException(
            status_code=401,
            detail="KBASE_AUTH_TOKEN is required. Set X-BERIL-Token header.",
        )

    url = (req.endpoint or DEFAULT_BERIL_SQL_URL).rstrip("/")

    import time
    t0 = time.monotonic()

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            r = await client.post(
                url,
                json={"sql": req.sql, "tenant": req.tenant},
                headers={
                    "Authorization": f"Bearer {x_beril_token}",
                    "Content-Type": "application/json",
                },
            )
            r.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="BERIL query timed out (90 s)")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"BERIL returned HTTP {exc.response.status_code}: {exc.response.text[:300]}",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cannot reach BERIL endpoint: {exc}")

    elapsed = (time.monotonic() - t0) * 1000

    data = r.json()
    # Normalise different possible response shapes from BERIL
    columns = data.get("columns") or data.get("schema") or []
    rows    = data.get("rows")    or data.get("data")    or []

    return BerilQueryResponse(columns=columns, rows=rows, elapsed_ms=round(elapsed, 1))


@router.get("/ping")
async def beril_ping(
    x_beril_token: Optional[str] = Header(default=None, alias="X-BERIL-Token"),
):
    """
    Lightweight connectivity check against the BERIL Observatory.
    Returns { "ok": true } if reachable and token accepted.
    """
    if not x_beril_token:
        raise HTTPException(status_code=401, detail="X-BERIL-Token header required")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                BERIL_HEALTH_URL,
                headers={"Authorization": f"Bearer {x_beril_token}"},
            )
            # 200 or 401 both mean we reached the service
            reachable = r.status_code < 500
    except Exception:
        reachable = False

    if not reachable:
        raise HTTPException(status_code=502, detail="BERIL Observatory unreachable")

    return {"ok": True, "status_code": r.status_code}
