import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listNotebooks } from "../api/client";
import type { NotebookMeta } from "../api/client";

export default function TenantPage() {
  const { tenant } = useParams<{ tenant: string }>();
  const [notebooks, setNotebooks] = useState<NotebookMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    listNotebooks(tenant)
      .then(setNotebooks)
      .catch(() => setError("Failed to load notebooks."))
      .finally(() => setLoading(false));
  }, [tenant]);

  if (loading) return <div className="loading">Loading notebooks…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="tenant-page">
      <nav className="breadcrumb">
        <Link to="/">Workspace</Link> / {tenant}
      </nav>
      <h1>{tenant}</h1>

      <section className="notebook-list">
        <h2>Notebooks</h2>
        {notebooks.length === 0 ? (
          <p>No notebooks found. Create one to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Last Modified</th>
                <th>Size</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {notebooks.map((nb) => (
                <tr key={nb.path}>
                  <td>{nb.name}</td>
                  <td>{nb.last_modified ? new Date(nb.last_modified).toLocaleString() : "—"}</td>
                  <td>{(nb.size / 1024).toFixed(1)} KB</td>
                  <td>
                    <Link
                      to={`/tenants/${tenant}/notebooks?path=${encodeURIComponent(nb.path)}`}
                      className="open-btn"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
