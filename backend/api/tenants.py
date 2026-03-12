from fastapi import APIRouter, Depends, HTTPException
from auth.middleware import get_current_user, TokenData

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/")
async def list_tenants(user: TokenData = Depends(get_current_user)):
    """List tenants the current user belongs to."""
    return {"tenants": user.tenants}


@router.get("/{tenant}")
async def get_tenant(tenant: str, user: TokenData = Depends(get_current_user)):
    """Get details for a specific tenant."""
    if tenant not in user.tenants:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")
    return {
        "name": tenant,
        "description": f"{tenant} tenant workspace",
        "storage_bucket": f"{tenant}-data",
    }
