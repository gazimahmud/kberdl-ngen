// All API calls are mocked for the proof-of-concept frontend demo.
// No backend required — replace mock implementations with real axios calls when a backend is available.

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Types ─────────────────────────────────────────────────────────────────────

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

export interface SqlResult {
  columns: string[];
  rows: (string | null)[][];
  elapsed_ms: number;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_TENANTS = [
  "aile", "asymbio", "bravebread", "enigma", "ese",
  "globalusers", "ideas", "kbase", "kessence",
  "microbdiscoveryforge", "nmdc", "phagefoundry",
  "planetmicrobe", "pnnlsoil", "protect", "usgis",
];

const MOCK_NOTEBOOKS: NotebookMeta[] = [
  { name: "pangenome_day1_EDA.ipynb",  path: "/notebooks/pangenome_day1_EDA.ipynb",  size: 989956, last_modified: "2024-02-15T10:23:00Z" },
  { name: "ingest-parquet.ipynb",      path: "/notebooks/ingest-parquet.ipynb",      size: 43854,  last_modified: "2024-02-12T14:45:00Z" },
  { name: "EDA_planetmicrobe.ipynb",   path: "/notebooks/EDA_planetmicrobe.ipynb",   size: 22086,  last_modified: "2024-02-08T09:12:00Z" },
];

// ── Mock API ──────────────────────────────────────────────────────────────────

export const getWorkspace = async (): Promise<Workspace> => {
  await delay(200);
  return { username: "admin", tenants: MOCK_TENANTS, display_name: "Admin User" };
};

export const getTenants = async (): Promise<string[]> => {
  await delay(300);
  return MOCK_TENANTS;
};

export const listNotebooks = async (_tenant: string, _username?: string): Promise<NotebookMeta[]> => {
  return MOCK_NOTEBOOKS;
};

export const getNotebook = async (_tenant: string, path: string): Promise<Notebook> => {
  // Fetch the real .ipynb file from the static assets served by Vite / GitHub Pages.
  // import.meta.env.BASE_URL is "/" in dev and "/kberdl-ngen/" in production.
  const url = `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const content = await res.json() as Record<string, unknown>;
  return { path, content };
};

export const saveNotebook = async (
  _tenant: string,
  _path: string,
  _content: Record<string, unknown>,
): Promise<void> => {
  await delay(100);
};

export const startKernel = async (_tenant: string): Promise<{ kernel_id: string; kernel_name: string }> => {
  await delay(500);
  return { kernel_id: "mock-kernel-id", kernel_name: "python3" };
};

export const interruptKernel = async (_tenant: string, _kernelId: string): Promise<void> => {
  await delay(100);
};

export const getDiscoveries = async (): Promise<unknown> => {
  await delay(300);
  return [];
};

export const executeSql = async (_tenant: string, _query: string): Promise<SqlResult> => {
  await delay(1000);
  return { columns: [], rows: [], elapsed_ms: 1000 };
};
