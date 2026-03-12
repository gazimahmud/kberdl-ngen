"""
Proxy for the BERIL Knowledge Observatory discoveries endpoint.
The internal NERSC service URL is not reachable from browsers,
so the BFF fetches it server-side and forwards the response.
"""
import json
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/observatory", tags=["observatory"])

BERIL_DISCOVERIES_URL = (
    "http://beril-observatory.knowledge-engine.development.svc.spin.nersc.org"
    "/knowledge/discoveries"
)


@router.get("/discoveries")
async def get_discoveries():
    """Proxy BERIL Observatory /knowledge/discoveries."""
    # 1. Make the HTTP request
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(BERIL_DISCOVERIES_URL)
            r.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Observatory service timed out")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Observatory returned HTTP {exc.response.status_code}",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not connect to Observatory: {exc}")

    # 2. Parse the body — guard against empty / non-JSON responses
    if not r.content:
        return []

    try:
        return r.json()
    except json.JSONDecodeError:
        # Surface the raw text so we can diagnose what the endpoint actually returns
        preview = r.text[:300].replace("\n", " ")
        raise HTTPException(
            status_code=502,
            detail=f"Observatory returned non-JSON content: {preview}",
        )
