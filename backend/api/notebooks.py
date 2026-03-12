from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.middleware import get_current_user, TokenData
from core import minio_client

router = APIRouter(prefix="/notebooks", tags=["notebooks"])


class NotebookSaveRequest(BaseModel):
    path: str
    content: dict


@router.get("/{tenant}")
async def list_notebooks(
    tenant: str,
    as_user: str | None = None,
    user: TokenData = Depends(get_current_user),
):
    """List notebooks for the current user (or a specific user path) under a tenant."""
    if tenant not in user.tenants:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")
    effective_user = as_user or user.username
    notebooks = minio_client.list_notebooks(tenant, effective_user)
    return {"notebooks": notebooks}


@router.get("/{tenant}/content")
async def get_notebook(
    tenant: str,
    path: str,
    user: TokenData = Depends(get_current_user),
):
    """Fetch a notebook's content from MinIO."""
    if tenant not in user.tenants:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")
    if not path.startswith(f"{tenant}/{user.username}/"):
        raise HTTPException(status_code=403, detail="Access denied to this notebook")
    try:
        notebook = minio_client.get_notebook(path)
        return {"path": path, "content": notebook}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Notebook not found: {e}")


@router.put("/{tenant}/content")
async def save_notebook(
    tenant: str,
    body: NotebookSaveRequest,
    user: TokenData = Depends(get_current_user),
):
    """Save a notebook back to MinIO."""
    if tenant not in user.tenants:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")
    if not body.path.startswith(f"{tenant}/{user.username}/"):
        raise HTTPException(status_code=403, detail="Access denied to this notebook")
    try:
        minio_client.save_notebook(body.path, body.content)
        return {"status": "saved", "path": body.path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save notebook: {e}")
