import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Editor, { type OnMount } from "@monaco-editor/react";
import { getNotebook, interruptKernel, saveNotebook, startKernel } from "../api/client";
import { useKernel, type JupyterMsg } from "../kernel/useKernel";

// ─────────────────────────────── Types ───────────────────────────────

type OutputType = "stream" | "execute_result" | "display_data" | "error";

interface IOutput {
  output_type: OutputType;
  // stream
  name?: "stdout" | "stderr";
  text?: string | string[];
  // execute_result / display_data
  data?: Record<string, string | string[]>;
  metadata?: Record<string, unknown>;
  execution_count?: number | null;
  // error
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

interface ICell {
  id: string;
  cell_type: "code" | "markdown" | "raw";
  source: string;
  outputs: IOutput[];
  execution_count: number | null;
  editing: boolean;   // markdown: true = edit mode
}

// ─────────────────────────────── Helpers ─────────────────────────────

function toStr(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v.join("") : v;
}

function normalizeCells(raw: unknown[]): ICell[] {
  return (raw ?? []).map((c, i) => {
    const cell = c as Record<string, unknown>;
    return {
      id: `cell-${i}-${crypto.randomUUID()}`,
      cell_type: (cell.cell_type as ICell["cell_type"]) ?? "code",
      source: toStr(cell.source as string | string[]),
      outputs: (cell.outputs as IOutput[]) ?? [],
      execution_count: (cell.execution_count as number | null) ?? null,
      editing: false,
    };
  });
}

function denormalizeCells(cells: ICell[]): Record<string, unknown>[] {
  return cells.map((cell) => ({
    cell_type: cell.cell_type,
    source: cell.source,
    outputs: cell.outputs,
    execution_count: cell.execution_count,
    metadata: {},
    id: cell.id,
  }));
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

// ──────────────────────────── Markdown renderer ───────────────────────

function inlineFormat(text: string): string {
  return text
    // Images before links
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%">')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    // Italic (avoid matching bold markers)
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="nb-icode">$1</code>');
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  let inList = false;
  let codeLang = "";
  const codeLines: string[] = [];

  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  for (const line of lines) {
    // Code block fence
    if (line.startsWith("```")) {
      if (inCode) {
        const lang = codeLang ? ` class="language-${codeLang}"` : "";
        out.push(`<pre class="nb-md-pre"><code${lang}>${escHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines.length = 0;
        codeLang = "";
        inCode = false;
      } else {
        if (inList) { out.push("</ul>"); inList = false; }
        codeLang = line.slice(3).trim();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    // Blank line
    if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("");
      continue;
    }

    // Headings
    const hm = line.match(/^(#{1,6})\s+(.*)/);
    if (hm) {
      if (inList) { out.push("</ul>"); inList = false; }
      const lvl = hm[1].length;
      out.push(`<h${lvl} class="nb-md-h">${inlineFormat(hm[2])}</h${lvl}>`);
      continue;
    }

    // HR
    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("<hr>");
      continue;
    }

    // Blockquote
    const bq = line.match(/^>\s*(.*)/);
    if (bq) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<blockquote class="nb-md-bq">${inlineFormat(bq[1])}</blockquote>`);
      continue;
    }

    // Unordered list
    const ul = line.match(/^[\*\-\+]\s+(.*)/);
    if (ul) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inlineFormat(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const oli = line.match(/^\d+\.\s+(.*)/);
    if (oli) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inlineFormat(oli[1])}</li>`);
      continue;
    }

    if (inList) { out.push("</ul>"); inList = false; }

    // Regular paragraph
    out.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) out.push("</ul>");
  if (inCode && codeLines.length) {
    out.push(`<pre class="nb-md-pre"><code>${escHtml(codeLines.join("\n"))}</code></pre>`);
  }

  return out.join("\n");
}

// ──────────────────────────── MimeBundle ──────────────────────────────

function MimeBundle({ data }: { data: Record<string, string | string[]> }) {
  if (data["text/html"]) {
    return (
      <iframe
        srcDoc={toStr(data["text/html"])}
        className="nb-iframe"
        sandbox="allow-scripts"
        title="cell output"
      />
    );
  }
  if (data["image/png"]) {
    return (
      <img
        src={`data:image/png;base64,${toStr(data["image/png"])}`}
        className="nb-img"
        alt="cell output"
      />
    );
  }
  if (data["image/jpeg"]) {
    return (
      <img
        src={`data:image/jpeg;base64,${toStr(data["image/jpeg"])}`}
        className="nb-img"
        alt="cell output"
      />
    );
  }
  if (data["image/svg+xml"]) {
    return (
      <div
        className="nb-svg"
        dangerouslySetInnerHTML={{ __html: toStr(data["image/svg+xml"]) }}
      />
    );
  }
  if (data["text/plain"]) {
    return <pre className="nb-pre">{toStr(data["text/plain"])}</pre>;
  }
  return null;
}

// ─────────────────────────── CellOutput ──────────────────────────────

function CellOutput({ output }: { output: IOutput }) {
  switch (output.output_type) {
    case "stream":
      return (
        <pre className={`nb-pre${output.name === "stderr" ? " nb-pre--err" : ""}`}>
          {toStr(output.text)}
        </pre>
      );
    case "execute_result":
    case "display_data":
      return output.data ? <MimeBundle data={output.data} /> : null;
    case "error": {
      const tb = (output.traceback ?? []).map(stripAnsi).join("\n");
      return (
        <pre className="nb-pre nb-pre--err">
          <strong>{output.ename}: {output.evalue}</strong>
          {tb ? "\n" + tb : ""}
        </pre>
      );
    }
    default:
      return null;
  }
}

// ─────────────────────────── CodeCell ─────────────────────────────────

function CodeCell({
  source,
  active,
  onChange,
  onRun,
}: {
  source: string;
  active: boolean;
  onChange: (val: string) => void;
  onRun: () => void;
}) {
  const [height, setHeight] = useState(80);

  const handleMount: OnMount = (ed, monaco) => {
    const updateHeight = () => setHeight(Math.max(80, ed.getContentHeight() + 8));
    updateHeight();
    ed.onDidContentSizeChange(updateHeight);
    ed.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => { onRun(); });
  };

  return (
    <Editor
      height={height}
      language="python"
      value={source}
      theme="light"
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
        lineNumbers: active ? "on" : "off",
        renderLineHighlight: "none",
        padding: { top: 8, bottom: 8 },
        overviewRulerLanes: 0,
        folding: false,
        glyphMargin: false,
        scrollbar: { vertical: "hidden", horizontal: "auto" },
        wordWrap: "on",
      }}
    />
  );
}

// ─────────────────────────── MarkdownCell ──────────────────────────────

function MarkdownCell({
  source,
  editing,
  onChange,
  onToggleEdit,
}: {
  source: string;
  editing: boolean;
  onChange: (val: string) => void;
  onToggleEdit: () => void;
}) {
  const [height, setHeight] = useState(80);

  if (editing) {
    const handleMount: OnMount = (ed, monaco) => {
      const updateHeight = () => setHeight(Math.max(80, ed.getContentHeight() + 8));
      updateHeight();
      ed.onDidContentSizeChange(updateHeight);
      // Shift+Enter or Escape → exit edit mode
      ed.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, onToggleEdit);
      ed.addCommand(monaco.KeyCode.Escape, onToggleEdit);
    };

    return (
      <div className="nb-md-editor">
        <Editor
          height={height}
          language="markdown"
          value={source}
          theme="light"
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
            lineNumbers: "off",
            renderLineHighlight: "none",
            padding: { top: 8, bottom: 8 },
            overviewRulerLanes: 0,
            folding: false,
            glyphMargin: false,
            scrollbar: { vertical: "hidden", horizontal: "auto" },
            wordWrap: "on",
          }}
        />
        <div className="nb-md-hint">Shift+Enter or Esc to render</div>
      </div>
    );
  }

  const rendered = renderMarkdown(source);
  return (
    <div
      className="nb-md-preview"
      onDoubleClick={onToggleEdit}
      dangerouslySetInnerHTML={{
        __html: rendered || '<span class="nb-md-empty">Double-click to edit markdown</span>',
      }}
    />
  );
}

// ─────────────────────────── CellDivider ─────────────────────────────

function CellDivider({
  onAddCode,
  onAddMarkdown,
}: {
  onAddCode: () => void;
  onAddMarkdown: () => void;
}) {
  return (
    <div className="nb-divider">
      <div className="nb-divider-inner">
        <div className="nb-divider-line" />
        <div className="nb-divider-actions">
          <button className="nb-divider-btn" onClick={onAddCode}>
            <i className="fa-solid fa-plus" /> Code
          </button>
          <button className="nb-divider-btn" onClick={onAddMarkdown}>
            <i className="fa-solid fa-plus" /> Markdown
          </button>
        </div>
        <div className="nb-divider-line" />
      </div>
    </div>
  );
}

// ─────────────────────────── CellContainer ───────────────────────────

function CellContainer({
  cell,
  active,
  running,
  onActivate,
  onSourceChange,
  onRun,
  onToggleEdit,
  onDelete,
}: {
  cell: ICell;
  active: boolean;
  running: boolean;
  onActivate: () => void;
  onSourceChange: (val: string) => void;
  onRun: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`nb-cell nb-cell--${cell.cell_type}${active ? " nb-cell--active" : ""}`}
      onClick={onActivate}
    >
      {/* Gutter */}
      <div className="nb-gutter">
        {cell.cell_type === "code" && (
          <>
            <span className="nb-exec-count">
              {running
                ? <i className="fa-solid fa-circle-notch fa-spin" />
                : `[${cell.execution_count ?? " "}]`
              }
            </span>
            <button
              className="nb-run-btn"
              onClick={(e) => { e.stopPropagation(); onRun(); }}
              title="Run cell (Shift+Enter)"
              disabled={running}
            >
              <i className="fa-solid fa-play" />
            </button>
          </>
        )}
        {cell.cell_type === "markdown" && (
          <button
            className="nb-run-btn"
            onClick={(e) => { e.stopPropagation(); onToggleEdit(); }}
            title={cell.editing ? "Render markdown" : "Edit markdown"}
          >
            <i className={`fa-solid ${cell.editing ? "fa-eye" : "fa-pen"}`} />
          </button>
        )}
      </div>

      {/* Cell body */}
      <div className="nb-cell-body">
        {cell.cell_type === "code" ? (
          <CodeCell
            source={cell.source}
            active={active}
            onChange={onSourceChange}
            onRun={onRun}
          />
        ) : cell.cell_type === "markdown" ? (
          <MarkdownCell
            source={cell.source}
            editing={cell.editing}
            onChange={onSourceChange}
            onToggleEdit={onToggleEdit}
          />
        ) : (
          <pre className="nb-raw">{cell.source}</pre>
        )}

        {/* Outputs (code cells only) */}
        {cell.outputs.length > 0 && (
          <div className="nb-outputs">
            {cell.outputs.map((o, oi) => (
              <div key={oi} className="nb-output">
                <CellOutput output={o} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cell action bar (visible on hover) */}
      {active && (
        <div className="nb-cell-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="nb-cell-action-btn"
            onClick={onDelete}
            title="Delete cell"
          >
            <i className="fa-solid fa-trash-can" />
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── NotebookPage ───────────────────────────

export default function NotebookPage() {
  const { tenant } = useParams<{ tenant: string }>();
  const [searchParams] = useSearchParams();
  const path     = searchParams.get("path") ?? "";
  const fromPath = searchParams.get("from");   // e.g. "/projects/enigma_...?from=tenant:enigma"

  const [cells, setCells] = useState<ICell[]>([]);
  const [activeCellIdx, setActiveCellIdx] = useState(0);
  const [runningCells, setRunningCells] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const notebookMetaRef = useRef<Record<string, unknown>>({});

  const { status: kernelStatus, kernelId, connect, execute, disconnect } = useKernel(tenant ?? "");

  // ── Load notebook from MinIO via BFF ──
  useEffect(() => {
    if (!tenant || !path) return;
    getNotebook(tenant, path)
      .then(({ content }) => {
        notebookMetaRef.current = content;
        setCells(normalizeCells((content.cells as unknown[]) ?? []));
      })
      .catch((e: unknown) => setLoadError(String(e)))
      .finally(() => setLoading(false));
  }, [tenant, path]);

  // ── Start kernel on mount ──
  useEffect(() => {
    if (!tenant) return;
    startKernel(tenant).then(({ kernel_id }) => connect(kernel_id));
    return () => disconnect();
  }, [tenant, connect, disconnect]);

  // ── Run a single cell by id ──
  const runCell = useCallback(
    async (cellId: string) => {
      const cell = cells.find((c) => c.id === cellId);
      if (!cell || cell.cell_type !== "code") return;

      setRunningCells((prev) => new Set(prev).add(cellId));
      setCells((prev) =>
        prev.map((c) => c.id === cellId ? { ...c, outputs: [], execution_count: null } : c)
      );

      const newOutputs: IOutput[] = [];
      try {
        await execute(cell.source, (msg: JupyterMsg) => {
          const msgType = msg.header.msg_type as OutputType;
          const content = msg.content as Record<string, unknown>;

          const output: IOutput = { output_type: msgType, ...content } as IOutput;
          newOutputs.push(output);
          setCells((prev) =>
            prev.map((c) =>
              c.id === cellId
                ? {
                    ...c,
                    outputs: [...newOutputs],
                    execution_count:
                      msgType === "execute_result"
                        ? ((content.execution_count as number) ?? c.execution_count)
                        : c.execution_count,
                  }
                : c
            )
          );
        });
      } catch {
        // kernel disconnected mid-run
      } finally {
        setRunningCells((prev) => { const s = new Set(prev); s.delete(cellId); return s; });
      }
    },
    [cells, execute]
  );

  // ── Run all code cells sequentially ──
  const runAll = useCallback(async () => {
    for (const cell of cells) {
      if (cell.cell_type === "code") await runCell(cell.id);
    }
  }, [cells, runCell]);

  // ── Interrupt kernel ──
  const handleInterrupt = useCallback(async () => {
    if (!tenant || !kernelId) return;
    try { await interruptKernel(tenant, kernelId); } catch { /* ignore */ }
  }, [tenant, kernelId]);

  // ── Clear all outputs ──
  const clearAll = useCallback(() => {
    setCells((prev) =>
      prev.map((c) => ({ ...c, outputs: [], execution_count: null }))
    );
  }, []);

  // ── Save notebook ──
  const handleSave = useCallback(async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      const updated = { ...notebookMetaRef.current, cells: denormalizeCells(cells) };
      await saveNotebook(tenant, path, updated);
      notebookMetaRef.current = updated;
    } finally {
      setSaving(false);
    }
  }, [tenant, path, cells]);

  // ── Add cell after a given index (-1 = prepend) ──
  const addCellAt = useCallback(
    (type: "code" | "markdown", afterIdx: number) => {
      const newCell: ICell = {
        id: `cell-new-${crypto.randomUUID()}`,
        cell_type: type,
        source: "",
        outputs: [],
        execution_count: null,
        editing: type === "markdown",
      };
      setCells((prev) => {
        const updated = [...prev];
        updated.splice(afterIdx + 1, 0, newCell);
        return updated;
      });
      setActiveCellIdx(afterIdx + 1);
    },
    []
  );

  // ── Delete a cell ──
  const deleteCell = useCallback((cellId: string) => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === cellId);
      const updated = prev.filter((c) => c.id !== cellId);
      setActiveCellIdx(Math.max(0, Math.min(idx, updated.length - 1)));
      return updated;
    });
  }, []);

  // ── Render ──

  if (loading) {
    return (
      <div className="loading">
        <i className="fa-solid fa-circle-notch fa-spin" /> Loading notebook…
      </div>
    );
  }
  if (loadError) {
    return <div className="error">Failed to load notebook: {loadError}</div>;
  }

  const filename = path.split("/").pop() ?? path;
  const isBusy = kernelStatus === "busy";

  return (
    <div className="nb-page">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        {fromPath ? (
          <>
            <Link to={fromPath} className="nb-back-dashboard">
              <i className="fa-solid fa-arrow-left" /> Back to Dashboard
            </Link>
            {" / "}
            <span>{filename}</span>
          </>
        ) : (
          <>
            <Link to="/">Workspace</Link>
            {" / "}
            <Link to={`/tenants/${tenant}`}>{tenant}</Link>
            {" / "}
            <span>{filename}</span>
          </>
        )}
      </nav>

      {/* Toolbar */}
      <div className="nb-toolbar">
        {/* Kernel status */}
        <span className={`nb-kern-badge nb-kern-badge--${kernelStatus}`}>
          <i
            className={`fa-solid ${
              kernelStatus === "idle"        ? "fa-circle" :
              kernelStatus === "busy"        ? "fa-circle-notch fa-spin" :
              kernelStatus === "connecting"  ? "fa-circle-notch fa-spin" :
              "fa-circle-xmark"
            }`}
          />
          {kernelStatus}
        </span>

        <div className="nb-tb-sep" />

        <button
          className="nb-tb-btn"
          onClick={() => runCell(cells[activeCellIdx]?.id)}
          disabled={isBusy || !cells[activeCellIdx] || cells[activeCellIdx].cell_type !== "code"}
          title="Run cell (Shift+Enter)"
        >
          <i className="fa-solid fa-play" /> Run
        </button>

        <button
          className="nb-tb-btn"
          onClick={runAll}
          disabled={isBusy}
          title="Run all cells"
        >
          <i className="fa-solid fa-forward-fast" /> Run All
        </button>

        <button
          className="nb-tb-btn nb-tb-btn--warn"
          onClick={handleInterrupt}
          disabled={!isBusy}
          title="Interrupt kernel"
        >
          <i className="fa-solid fa-stop" /> Interrupt
        </button>

        <button
          className="nb-tb-btn"
          onClick={clearAll}
          title="Clear all outputs"
        >
          <i className="fa-solid fa-eraser" /> Clear
        </button>

        <div style={{ flex: 1 }} />

        <button
          className="nb-tb-btn nb-tb-btn--add"
          onClick={() => addCellAt("code", activeCellIdx)}
          title="Insert code cell below active"
        >
          <i className="fa-solid fa-plus" /> Code
        </button>

        <button
          className="nb-tb-btn nb-tb-btn--add"
          onClick={() => addCellAt("markdown", activeCellIdx)}
          title="Insert markdown cell below active"
        >
          <i className="fa-solid fa-plus" /> Markdown
        </button>

        <button
          className={`nb-tb-btn nb-tb-btn--save`}
          onClick={handleSave}
          disabled={saving}
          title="Save notebook"
        >
          <i className={`fa-solid ${saving ? "fa-circle-notch fa-spin" : "fa-floppy-disk"}`} />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Cells — dividers between every cell for hover-insert affordance */}
      <div className="nb-cells">
        <CellDivider
          onAddCode={() => addCellAt("code", -1)}
          onAddMarkdown={() => addCellAt("markdown", -1)}
        />
        {cells.flatMap((cell, i) => [
          <CellContainer
            key={cell.id}
            cell={cell}
            active={i === activeCellIdx}
            running={runningCells.has(cell.id)}
            onActivate={() => setActiveCellIdx(i)}
            onSourceChange={(val) =>
              setCells((prev) =>
                prev.map((c) => c.id === cell.id ? { ...c, source: val } : c)
              )
            }
            onRun={() => runCell(cell.id)}
            onToggleEdit={() =>
              setCells((prev) =>
                prev.map((c) => c.id === cell.id ? { ...c, editing: !c.editing } : c)
              )
            }
            onDelete={() => deleteCell(cell.id)}
          />,
          <CellDivider
            key={`div-${cell.id}`}
            onAddCode={() => addCellAt("code", i)}
            onAddMarkdown={() => addCellAt("markdown", i)}
          />,
        ])}

        {cells.length === 0 && (
          <div className="nb-empty">
            <i className="fa-regular fa-file-code" />
            <p>No cells. Hover above to add one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
