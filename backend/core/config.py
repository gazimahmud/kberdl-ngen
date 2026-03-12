from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JupyterHub
    jupyterhub_url: str = "http://jupyterhub:8000"
    jupyterhub_api_token: str = ""          # Admin API token for JupyterHub

    # MinIO
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False
    minio_notebooks_bucket: str = "notebooks"

    # Auth — plug in your existing system here
    auth_secret_key: str = "change-me-in-production"
    auth_algorithm: str = "HS256"
    auth_token_expire_minutes: int = 480

    # App
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    debug: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
