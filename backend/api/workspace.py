from fastapi import APIRouter, Depends
from auth.middleware import get_current_user, TokenData

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("/")
async def get_workspace(user: TokenData = Depends(get_current_user)):
    """Return the current user's workspace summary."""
    return {
        "username": user.username,
        "tenants": user.tenants,
        "display_name": user.username,
    }
