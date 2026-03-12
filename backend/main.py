from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api import auth, workspace, tenants, notebooks, kernel_proxy, observatory, sql

app = FastAPI(
    title="K-BERDL Next-Gen API",
    description="BFF for the K-BERDL next-generation platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(workspace.router, prefix="/api")
app.include_router(tenants.router, prefix="/api")
app.include_router(notebooks.router, prefix="/api")
app.include_router(kernel_proxy.router, prefix="/api")
app.include_router(observatory.router, prefix="/api")
app.include_router(sql.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
