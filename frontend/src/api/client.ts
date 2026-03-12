import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export const apiClient = axios.create({ baseURL: API_BASE });

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Types
export interface Workspace {
  username: string;
  tenants: string[];
  display_name: string;
}

export interface NotebookMeta {
  name: string;
  path: string;
  size: number;
  last_modified: string;
}

export interface Notebook {
  path: string;
  content: Record<string, unknown>;
}

// API calls
export const getWorkspace = () =>
  apiClient.get<Workspace>("/api/workspace/").then((r) => r.data);

export const getTenants = () =>
  apiClient.get<{ tenants: string[] }>("/api/tenants/").then((r) => r.data.tenants);

export const listNotebooks = (tenant: string, username?: string) =>
  apiClient
    .get<{ notebooks: NotebookMeta[] }>(`/api/notebooks/${tenant}`, {
      params: username ? { as_user: username } : undefined,
    })
    .then((r) => r.data.notebooks);

export const getNotebook = (tenant: string, path: string) =>
  apiClient
    .get<Notebook>(`/api/notebooks/${tenant}/content`, { params: { path } })
    .then((r) => r.data);

export const saveNotebook = (tenant: string, path: string, content: Record<string, unknown>) =>
  apiClient.put(`/api/notebooks/${tenant}/content`, { path, content });

export const startKernel = (tenant: string) =>
  apiClient
    .post<{ kernel_id: string; kernel_name: string }>(
      `/api/kernels/${tenant}/start`,
      null,
      { params: { token: localStorage.getItem("token") } }
    )
    .then((r) => r.data);

export const interruptKernel = (tenant: string, kernelId: string) =>
  apiClient.post(
    `/api/kernels/${tenant}/${kernelId}/interrupt`,
    null,
    { params: { token: localStorage.getItem("token") } }
  );

export const getDiscoveries = () =>
  apiClient.get<unknown>("/api/observatory/discoveries").then((r) => r.data);

export interface SqlResult {
  columns: string[];
  rows: (string | null)[][];
  elapsed_ms: number;
}

export const executeSql = (tenant: string, query: string) =>
  apiClient
    .post<SqlResult>(`/api/sql/${tenant}/execute`, { query })
    .then((r) => r.data);
