"""
Auth middleware — pluggable design.

Currently implements simple JWT validation. Replace `verify_token` with
a call to your existing auth system (OIDC introspection, session lookup, etc.).
"""
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from core.config import settings


bearer_scheme = HTTPBearer()


class TokenData(BaseModel):
    username: str
    tenants: list[str] = []


def create_access_token(username: str, tenants: list[str]) -> str:
    """Create a JWT for a user. Call this from your login/auth endpoint."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.auth_token_expire_minutes)
    payload = {"sub": username, "tenants": tenants, "exp": expire}
    return jwt.encode(payload, settings.auth_secret_key, algorithm=settings.auth_algorithm)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> TokenData:
    """
    FastAPI dependency — validates the Bearer token and returns the user.

    To integrate with your existing auth system, replace the jwt.decode call
    with a call to your auth service (e.g., OIDC token introspection endpoint).
    """
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.auth_secret_key,
            algorithms=[settings.auth_algorithm],
        )
        username: str = payload.get("sub")
        tenants: list = payload.get("tenants", [])
        if not username:
            raise exc
        return TokenData(username=username, tenants=tenants)
    except JWTError:
        raise exc
