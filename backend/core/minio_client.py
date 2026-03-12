import json
import io
from minio import Minio
from minio.error import S3Error
from core.config import settings


def get_minio_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def list_notebooks(tenant: str, username: str) -> list[dict]:
    """List .ipynb files for a user under a tenant prefix."""
    client = get_minio_client()
    prefix = f"{tenant}/{username}/"
    try:
        objects = client.list_objects(
            settings.minio_notebooks_bucket,
            prefix=prefix,
            recursive=True,
        )
        return [
            {
                "name": obj.object_name.split("/")[-1],
                "path": obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
            }
            for obj in objects
            if obj.object_name.endswith(".ipynb")
        ]
    except S3Error:
        return []


def get_notebook(path: str) -> dict:
    """Fetch and parse a notebook from MinIO."""
    client = get_minio_client()
    response = client.get_object(settings.minio_notebooks_bucket, path)
    content = response.read()
    return json.loads(content)


def save_notebook(path: str, notebook: dict) -> None:
    """Save a notebook dict to MinIO."""
    client = get_minio_client()
    data = json.dumps(notebook).encode("utf-8")
    client.put_object(
        settings.minio_notebooks_bucket,
        path,
        io.BytesIO(data),
        length=len(data),
        content_type="application/json",
    )
