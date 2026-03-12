import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getTenants, listNotebooks, type NotebookMeta } from "../api/client";

// Matches WorkspacePage so labels are consistent
const DISPLAY_NAMES: Record<string, string> = {
  globalusers:          "GlobalUsers",
  pnnlsoil:             "PnnlSoil",
  ese:                  "Ese",
  usgis:                "USGIS",
  microbdiscoveryforge: "MicrobDiscoveryForge",
  planetmicrobe:        "PlanetMicrobe",
  phagefoundry:         "PhageFoundry",
  kessence:             "KeScience",
  bravebread:           "BraveBread",
  asymbio:              "Asynbio",
  kbase:                "KBase",
  nmdc:                 "NMDC",
  enigma:               "ENIGMA",
  ideas:                "IDEAS",
  aile:                 "AIAle",
  protect:              "Protect",
};

const TENANT_COLORS: Record<string, string> = {
  aile:                 "#3b82f6",
  asymbio:              "#10b981",
  bravebread:           "#f97316",
  enigma:               "#7c3aed",
  ese:                  "#0891b2",
  globalusers:          "#0f766e",
  ideas:                "#d97706",
  kbase:                "#127dc3",
  kessence:             "#6366f1",
  microbdiscoveryforge: "#16a34a",
  nmdc:                 "#ea580c",
  phagefoundry:         "#dc2626",
  planetmicrobe:        "#0369a1",
  usgis:                "#0284c7",
  pnnlsoil:             "#9333ea",
  protect:              "#475569",
};

function displayName(tenant: string): string {
  return DISPLAY_NAMES[tenant] ?? (tenant.charAt(0).toUpperCase() + tenant.slice(1));
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  iconOpen?: string;
  path?: string;
  isFile?: boolean;
  color?: string;
  children?: NavItem[];
}

// Static top-level items (workspace + tenant children injected dynamically)
const STATIC_ITEMS: NavItem[] = [
  {
    id: "workspace",
    label: "My Workspace",
    icon: "fa-solid fa-house",
    path: "/",
    children: [], // filled dynamically from kbase/admin bucket
  },
  {
    id: "projects",
    label: "My Projects",
    icon: "fa-solid fa-diagram-project",
    path: "/projects",
    children: [
      { id: "proj-notebooks", label: "Notebooks", icon: "fa-solid fa-book",         path: "/projects/notebooks" },
      { id: "proj-workflows", label: "Workflows", icon: "fa-solid fa-circle-nodes", path: "/projects/workflows" },
      { id: "proj-datasets",  label: "Datasets",  icon: "fa-solid fa-table-cells",  path: "/projects/datasets"  },
    ],
  },
  {
    id: "tenants",
    label: "My Tenants",
    icon: "fa-solid fa-database",
    path: "/tenants",
    children: [], // filled dynamically
  },
  {
    id: "global",
    label: "Global Share",
    icon: "fa-solid fa-globe",
    path: "/global",
  },
];

function collectExpandableIds(items: NavItem[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const item of items) {
    if (item.children) {
      result[item.id] = true;
      Object.assign(result, collectExpandableIds(item.children));
    }
  }
  return result;
}

interface NavNodeProps {
  item: NavItem;
  depth: number;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  collapsed: boolean;
}

function NavNode({ item, depth, expanded, toggle, collapsed }: NavNodeProps) {
  // ── Collapsed sidebar: only top-level items, icon + tooltip only ──
  if (collapsed) {
    if (depth > 0) return null;
    return (
      <NavLink
        to={item.path ?? "/"}
        className={({ isActive }) =>
          `nav-item nav-item--icon-only ${isActive ? "nav-item--active" : ""}`
        }
        title={item.label}
      >
        <i className={`${item.icon} nav-icon`} />
      </NavLink>
    );
  }

  const hasChildren = !!item.children?.length;
  const isExpanded  = !!expanded[item.id];
  const paddingLeft = `${0.85 + depth * 1.05}rem`;

  const iconClass = hasChildren && item.iconOpen
    ? (isExpanded ? item.iconOpen : item.icon)
    : item.icon;

  if (item.isFile) {
    return (
      <NavLink
        to={item.path ?? "/"}
        className={({ isActive }) =>
          `nav-item nav-item--file ${isActive ? "nav-item--active" : ""}`
        }
        style={{ paddingLeft }}
      >
        <i className={`${iconClass} nav-icon nav-icon--file`} />
        <span className="nav-label nav-label--file">{item.label}</span>
      </NavLink>
    );
  }

  if (hasChildren) {
    return (
      <div className="nav-group">
        <div
          className={`nav-item ${depth === 0 ? "nav-item--top" : "nav-item--subfolder"}`}
          style={{ paddingLeft }}
          onClick={() => toggle(item.id)}
        >
          <i className={`${iconClass} nav-icon`} />
          <span className="nav-label">{item.label}</span>
          {item.color && (
            <span className="nav-color-dot" style={{ background: item.color }} />
          )}
          <i className={`fa-solid ${isExpanded ? "fa-chevron-down" : "fa-chevron-right"} nav-chevron`} />
        </div>
        {isExpanded && (
          <div className="nav-children">
            {item.children!.map((child) => (
              <NavNode
                key={child.id}
                item={child}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
                collapsed={false}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Leaf nav link
  return (
    <NavLink
      to={item.path ?? "/"}
      className={({ isActive }) =>
        `nav-item nav-item--child ${isActive ? "nav-item--active" : ""}`
      }
      style={{ paddingLeft }}
    >
      <i className={`${iconClass} nav-icon nav-icon--sm`} />
      <span className="nav-label">{item.label}</span>
    </NavLink>
  );
}

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [tenants,     setTenants]     = useState<string[]>([]);
  const [wsNotebooks, setWsNotebooks] = useState<NotebookMeta[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    collectExpandableIds(STATIC_ITEMS)
  );
  const navigate = useNavigate();

  useEffect(() => {
    getTenants()
      .then(setTenants)
      .catch(() => {});
    listNotebooks("kbase", "admin")
      .then(setWsNotebooks)
      .catch(() => {});
  }, []);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Build nav items: inject real notebooks into workspace, tenants into My Tenants
  const navItems: NavItem[] = STATIC_ITEMS.map((item) => {
    if (item.id === "workspace") {
      return {
        ...item,
        children: wsNotebooks.length === 0
          ? [{ id: "ws-empty", label: "No notebooks found", icon: "fa-solid fa-circle-info", path: "/" }]
          : wsNotebooks.map((nb) => ({
              id:     `nb-${nb.path}`,
              label:  nb.name,
              icon:   "fa-solid fa-file-code",
              path:   `/notebook?path=${encodeURIComponent(nb.path)}`,
              isFile: true,
            })),
      };
    }
    if (item.id !== "tenants") return item;
    return {
      ...item,
      children: tenants.map((t) => ({
        id:       `tenant-${t}`,
        label:    displayName(t),
        icon:     "fa-solid fa-people-group",
        color:    TENANT_COLORS[t] ?? "#607d8b",
        children: [
          {
            id:    `tenant-${t}-catalog`,
            label: "Data Catalog",
            icon:  "fa-solid fa-book-open",
            path:  `/?tab=tenants&dictionary=${t}`,
          },
          {
            id:    `tenant-${t}-console`,
            label: "SQL Console",
            icon:  "fa-solid fa-terminal",
            path:  `/?tab=tenants&console=${t}`,
          },
          {
            id:    `tenant-${t}-projects`,
            label: "Projects",
            icon:  "fa-solid fa-diagram-project",
            path:  `/tenants/${t}`,
          },
        ],
      })),
    };
  });

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      {/* Toggle button */}
      <button
        className="sidebar-toggle-btn"
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <i className={`fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-left"}`} />
      </button>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavNode
            key={item.id}
            item={item}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout} title="Sign out">
          <i className="fa-solid fa-right-from-bracket" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
