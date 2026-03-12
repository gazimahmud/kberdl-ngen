# K-BERDL Next-Gen Platform

A modern web-based platform for the KBase BER Data Lakehouse — replacing the direct JupyterHub interface with a React frontend backed by a FastAPI BFF that proxies Jupyter kernel communication.

## Architecture

```
┌─────────────────────────────────────────┐
│         React Web App (Frontend)        │
│  Workspace | Tenants | Notebook Editor  │
└────────────────┬────────────────────────┘
                 │ HTTP + WebSocket
┌────────────────▼────────────────────────┐
│      FastAPI BFF (backend/)             │
│  - Auth middleware (pluggable)          │
│  - Workspace / Tenant / Notebook API    │
│  - Kernel WebSocket proxy               │
│  - MinIO notebook storage               │
└──────┬──────────────────────┬───────────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────────┐
│  JupyterHub │    │  MinIO / Delta Lake  │
│  (headless) │    │  (notebook storage)  │
└─────────────┘    └─────────────────────┘
```

## Project Structure

```
kberdl-ngen/
├── backend/                  # FastAPI BFF
│   ├── api/
│   │   ├── workspace.py      # /api/workspace
│   │   ├── tenants.py        # /api/tenants
│   │   ├── notebooks.py      # /api/notebooks
│   │   └── kernel_proxy.py   # /api/kernels (WebSocket proxy)
│   ├── auth/
│   │   └── middleware.py     # JWT auth (pluggable)
│   ├── core/
│   │   ├── config.py         # Settings (env-based)
│   │   ├── jupyterhub.py     # JupyterHub API client
│   │   └── minio_client.py   # MinIO notebook storage
│   ├── main.py
│   └── requirements.txt
│
├── frontend/                 # React + TypeScript (Vite)
│   ├── src/
│   │   ├── api/client.ts     # Typed API client
│   │   ├── kernel/
│   │   │   └── useKernel.ts  # @jupyterlab/services hook
│   │   ├── pages/
│   │   │   ├── WorkspacePage.tsx
│   │   │   ├── TenantPage.tsx
│   │   │   └── NotebookPage.tsx
│   │   └── App.tsx
│   └── package.json
│
└── docker-compose.yml
```

## Getting Started

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your JupyterHub admin token and MinIO credentials
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

### 3. Run locally (development)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Key Design Decisions

- **JupyterHub is headless** — users never see or interact with JupyterHub directly
- **Kernel proxy** — the BFF WebSocket endpoint proxies all kernel messages, keeping JupyterHub internal
- **Pluggable auth** — `backend/auth/middleware.py` uses JWT by default; swap `verify_token` to integrate your existing auth system
- **MinIO notebook storage** — notebooks stored as `.ipynb` files under `{tenant}/{username}/` prefixes
- **`@jupyterlab/services`** — the official Jupyter JS SDK handles all kernel protocol details in the frontend
