import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [search, setSearch]               = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-shell">
      {/* Top header */}
      <header className="app-header">
        <Link to="/" className="header-home-link">
          <img src="/kbase-mark.svg" className="header-logo-mark" alt="KBase" />
          <span className="app-logo">K-BERDL</span>
          <span className="header-pipe">|</span>
          <span className="app-title">KBase BER Data Lakehouse</span>
        </Link>
        <div className="header-center" />
        <div className="header-right">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass search-icon" />
            <input
              type="text"
              placeholder="Search resources…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="header-user">
            <i className="fa-solid fa-user" />
          </div>
        </div>
      </header>

      <div className="app-body">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
