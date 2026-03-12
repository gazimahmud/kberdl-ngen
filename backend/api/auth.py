from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from auth.middleware import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

# Mock user store — replace with your real auth system
MOCK_USERS = {
    "admin": {
        "password": "admin",
        "tenants": [
            "aile",
            "asymbio",
            "bravebread",
            "enigma",
            "ese",
            "globalusers",
            "ideas",
            "kbase",
            "kessence",
            "microbdiscoveryforge",
            "nmdc",
            "phagefoundry",
            "planetmicrobe",
            "usgis",
            "pnnlsoil",
            "protect",
        ],
        "display_name": "Admin User",
    }
}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str
    tenants: list[str]


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    user = MOCK_USERS.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(body.username, user["tenants"])
    return LoginResponse(
        token=token,
        username=body.username,
        tenants=user["tenants"],
    )
