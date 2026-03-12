import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

// ── Types ────────────────────────────────────────────────────────────────────

interface IOutput {
  output_type: string;
  text?: string | string[];
  data?: Record<string, unknown>;
  ename?: string;
  evalue?: string;
}

interface ICell {
  cell_type: "code" | "markdown" | "raw";
  source: string | string[];
  outputs?: IOutput[];
  execution_count?: number | null;
}

interface INotebook {
  cells: ICell[];
  metadata?: { kernelspec?: { display_name?: string; language?: string } };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function src(cell: ICell) {
  return Array.isArray(cell.source) ? cell.source.join("") : (cell.source ?? "");
}

function getOutputText(out: IOutput): string {
  if (out.output_type === "stream") {
    const t = out.text;
    return Array.isArray(t) ? t.join("") : (t ?? "");
  }
  if (out.output_type === "execute_result" || out.output_type === "display_data") {
    const plain = (out.data ?? {})["text/plain"];
    return Array.isArray(plain) ? (plain as string[]).join("") : ((plain ?? "") as string);
  }
  if (out.output_type === "error") {
    return `${out.ename}: ${out.evalue}`;
  }
  return "";
}

// Minimal markdown → HTML (handles patterns found in these notebooks)
function renderMarkdown(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      // Apply inline formatting
      let html = line
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`\n]+)`/g, '<code class="nbv-icode">$1</code>')
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );

      if (/^#### /.test(line)) return `<h4 class="nbv-hd">${html.replace(/^#### /, "")}</h4>`;
      if (/^### /.test(line))  return `<h3 class="nbv-hd">${html.replace(/^### /, "")}</h3>`;
      if (/^## /.test(line))   return `<h2 class="nbv-hd">${html.replace(/^## /, "")}</h2>`;
      if (/^# /.test(line))    return `<h1 class="nbv-hd">${html.replace(/^# /, "")}</h1>`;
      if (/^[-*] /.test(line)) return `<li>${html.replace(/^[-*] /, "")}</li>`;
      if (/^\d+\. /.test(line)) return `<li>${html.replace(/^\d+\. /, "")}</li>`;
      if (line.trim() === "")  return "<br>";
      return `${html}<br>`;
    })
    .join("");
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotebookViewerPage() {
  const [searchParams]                  = useSearchParams();
  const navigate                        = useNavigate();
  const path                            = searchParams.get("path") ?? "";
  const [notebook, setNotebook]         = useState<INotebook | null>(null);
  const [error,    setError]            = useState<string | null>(null);
  const [loading,  setLoading]          = useState(true);

  useEffect(() => {
    if (!path) { setLoading(false); return; }
    // BASE_URL = "/kberdl-ngen/" in prod, "/" in dev (set by Vite base config)
    const url = `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((nb: INotebook) => setNotebook(nb))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);

  const filename = path.split("/").pop() ?? "Notebook";
  const kernel   = notebook?.metadata?.kernelspec?.display_name ?? "Python 3";

  if (loading) return (
    <div className="nbv-state">
      <i className="fa-solid fa-circle-notch fa-spin" />
      <span>Loading {filename}…</span>
    </div>
  );

  if (error) return (
    <div className="nbv-state nbv-state--error">
      <i className="fa-solid fa-circle-exclamation" />
      <span>Could not load notebook: {error}</span>
    </div>
  );

  if (!notebook) return null;

  let execCount = 0;

  return (
    <div className="nbv-page">

      {/* ── Header ── */}
      <div className="nbv-header">
        <button className="dd-back-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left" /> Back
        </button>
        <div className="nbv-title-row">
          <i className="fa-solid fa-file-code nbv-file-icon" />
          <h2 className="nbv-title">{filename}</h2>
        </div>
        <div className="nbv-meta-row">
          <span className="nbv-badge nbv-badge--kernel">
            <i className="fa-brands fa-python" /> {kernel}
          </span>
          <span className="nbv-badge nbv-badge--cells">
            {notebook.cells.filter(c => src(c).trim()).length} cells
          </span>
        </div>
      </div>

      {/* ── Cells ── */}
      <div className="nbv-cells">
        {notebook.cells.map((cell, idx) => {
          const code = src(cell);
          if (!code.trim()) return null;

          if (cell.cell_type === "markdown") {
            return (
              <div key={idx} className="nbv-cell nbv-cell--md">
                <div
                  className="nbv-md-body"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(code) }}
                />
              </div>
            );
          }

          if (cell.cell_type === "code") {
            execCount += 1;
            const label   = cell.execution_count ?? execCount;
            const outputs = (cell.outputs ?? []).map(getOutputText).filter(Boolean);
            return (
              <div key={idx} className="nbv-cell nbv-cell--code">
                <div className="nbv-in-row">
                  <span className="nbv-prompt">[{label}]:</span>
                  <pre className="nbv-code-pre"><code>{code}</code></pre>
                </div>
                {outputs.length > 0 && (
                  <div className="nbv-out-row">
                    <span className="nbv-prompt nbv-prompt--out">&nbsp;</span>
                    <pre className="nbv-output-pre">{outputs.join("")}</pre>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

    </div>
  );
}
