import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { getTenants, listNotebooks, type NotebookMeta } from "../api/client";
import { PROJECTS_BY_TENANT } from "../pages/KnowledgeDashboardPage";

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
  navigable?: boolean;  // when true with children: label navigates, chevron toggles
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
    navigable: true,
    children: [
      { id: "proj-acinetobacter_adp1_explorer",              label: "ADP1 Data Explorer",                 icon: "fa-solid fa-layer-group",  path: "/projects/acinetobacter_adp1_explorer" },
      { id: "proj-adp1_deletion_phenotypes",                 label: "ADP1 Deletion Phenotypes",           icon: "fa-solid fa-flask",         path: "/projects/adp1_deletion_phenotypes" },
      { id: "proj-adp1_triple_essentiality",                 label: "ADP1 Triple Essentiality",           icon: "fa-solid fa-flask",         path: "/projects/adp1_triple_essentiality" },
      { id: "proj-amr_pangenome_atlas",                      label: "Pan-Bacterial AMR Gene Atlas",       icon: "fa-solid fa-shield-virus",  path: "/projects/amr_pangenome_atlas" },
      { id: "proj-aromatic_catabolism_network",              label: "Aromatic Catabolism Network",        icon: "fa-solid fa-network-wired", path: "/projects/aromatic_catabolism_network" },
      { id: "proj-bacdive_metal_validation",                 label: "BacDive Metal Validation",           icon: "fa-solid fa-atom",          path: "/projects/bacdive_metal_validation" },
      { id: "proj-bacdive_phenotype_metal_tolerance",        label: "BacDive Phenotype Signatures",       icon: "fa-solid fa-atom",          path: "/projects/bacdive_phenotype_metal_tolerance" },
      { id: "proj-cofitness_coinheritance",                  label: "Co-fitness & Co-inheritance",        icon: "fa-solid fa-microscope",    path: "/projects/cofitness_coinheritance" },
      { id: "proj-cog_analysis",                             label: "COG Functional Categories",          icon: "fa-solid fa-dna",           path: "/projects/cog_analysis" },
      { id: "proj-conservation_fitness_synthesis",           label: "Conservation & Fitness Synthesis",   icon: "fa-solid fa-star",          path: "/projects/conservation_fitness_synthesis" },
      { id: "proj-conservation_vs_fitness",                  label: "Conservation vs Fitness",            icon: "fa-solid fa-microscope",    path: "/projects/conservation_vs_fitness" },
      { id: "proj-core_gene_tradeoffs",                      label: "Core Gene Burden Paradox",           icon: "fa-solid fa-dna",           path: "/projects/core_gene_tradeoffs" },
      { id: "proj-costly_dispensable_genes",                 label: "Costly + Dispensable Genes",         icon: "fa-solid fa-microscope",    path: "/projects/costly_dispensable_genes" },
      { id: "proj-counter_ion_effects",                      label: "Counter Ion Effects",                icon: "fa-solid fa-atom",          path: "/projects/counter_ion_effects" },
      { id: "proj-ecotype_analysis",                         label: "Ecotype Correlation Analysis",       icon: "fa-solid fa-tree",          path: "/projects/ecotype_analysis" },
      { id: "proj-ecotype_env_reanalysis",                   label: "Ecotype Env-Only Reanalysis",        icon: "fa-solid fa-leaf",          path: "/projects/ecotype_env_reanalysis" },
      { id: "proj-enigma_contamination_functional_potential",label: "ENIGMA Contamination & Function",    icon: "fa-solid fa-leaf",          path: "/projects/enigma_contamination_functional_potential" },
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
  const location = useLocation();
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
    const isActive = item.navigable && item.path && location.pathname === item.path.split("?")[0];
    return (
      <div className="nav-group">
        <div
          className={`nav-item ${depth === 0 ? "nav-item--top" : "nav-item--subfolder"}${isActive ? " nav-item--active" : ""}`}
          style={{ paddingLeft }}
          onClick={item.navigable ? undefined : () => toggle(item.id)}
        >
          {item.navigable && item.path ? (
            <NavLink to={item.path} className="nav-folder-link">
              <i className={`${iconClass} nav-icon`} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ) : (
            <>
              <i className={`${iconClass} nav-icon`} />
              <span className="nav-label">{item.label}</span>
            </>
          )}
          {item.color && (
            <span className="nav-color-dot" style={{ background: item.color }} />
          )}
          <i
            className={`fa-solid ${isExpanded ? "fa-chevron-down" : "fa-chevron-right"} nav-chevron`}
            onClick={(e) => { e.stopPropagation(); toggle(item.id); }}
          />
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
              path:   `/tenants/kbase/notebooks?path=${encodeURIComponent(nb.path)}`,
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
            id:       `tenant-${t}-projects`,
            label:    "Discovery Catalog",
            icon:     "fa-solid fa-diagram-project",
            path:     `/projects?tenant=${t}`,
            navigable: true,
            children: (PROJECTS_BY_TENANT[t] ?? []).map((p) => ({
              id:    `tenant-${t}-proj-${p.id}`,
              label: p.title,
              icon:  "fa-solid fa-flask",
              path:  `/projects/${p.id}?from=tenant:${t}`,
            })),
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
