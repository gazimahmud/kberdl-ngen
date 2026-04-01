import { useParams, Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────

interface TenantMember {
  name: string;
  jobTitle: string;
  role: "member" | "steward";
  photo?: string;
}

interface ImpactDimension {
  label: string;
  score: number;
  color: string;
  icon: string;
}

interface MemberProfile extends TenantMember {
  tenant: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function makeRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => { h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0; return (h >>> 0) / 0xffffffff; };
}

function pick<T>(arr: T[], rng: () => number, n: number): T[] {
  return [...arr].sort(() => rng() - 0.5).slice(0, n);
}

// ── Data pools ────────────────────────────────────────────────────────

const RESEARCH_OUTCOMES = [
  { title: "ADP1 Data Explorer", outcome: "Characterized 15-table multi-omics SQLite database with 461K rows across 6 data modalities", tag: "Multi-Omics" },
  { title: "ADP1 Deletion Phenotypes", outcome: "Identified 625 condition-specific genes mapping to expected metabolic pathways across 8 carbon sources", tag: "Genomics" },
  { title: "ADP1 Triple Essentiality", outcome: "Analyzed FBA/TnSeq/growth concordance across 478 triple-covered genes revealing condition-specific discordance patterns", tag: "Modeling" },
  { title: "Pan-Bacterial AMR Gene Atlas", outcome: "Catalogued AMR genes across 27,000 species and 132M gene clusters; identified resistance hotspots in Pseudomonadota and Bacillota", tag: "AMR" },
  { title: "Aromatic Catabolism Support Network", outcome: "Defined 51-gene support network for aromatic catabolism dominated by Complex I (41%)", tag: "Metabolism" },
  { title: "BacDive Metal Tolerance Validation", outcome: "Validated metal tolerance predictions against 97K BacDive strains; heavy metal isolates scored +1.00 SD higher", tag: "Phenomics" },
  { title: "BacDive Phenotype Signatures", outcome: "Demonstrated genome-encoded gene count (R²=0.63) dramatically outperforms phenotypic predictors for metal tolerance", tag: "ML" },
  { title: "Co-fitness Predicts Co-inheritance", outcome: "Showed functional coupling constrains pangenome evolution across bacterial lineages", tag: "Evolution" },
  { title: "COG Functional Category Analysis", outcome: "Mapped COG functional categories to fitness signatures across 100+ organisms in the fitness browser", tag: "Annotation" },
  { title: "Gene Conservation & Fitness Synthesis", outcome: "Synthesized conservation and fitness data to identify universal vs. niche-specific essential genes", tag: "Genomics" },
  { title: "Conservation vs Fitness", outcome: "Revealed that highly conserved genes are not necessarily fitness-critical under standard conditions", tag: "Evolution" },
  { title: "Core Gene Burden Paradox", outcome: "Documented that core genome size inversely correlates with ecological generalism in certain clades", tag: "Pangenomics" },
  { title: "Costly + Dispensable Genes", outcome: "Quantified energetic cost of maintaining dispensable genes and linked to genome streamlining pressures", tag: "Genomics" },
  { title: "Counter Ion Effects on Metal Fitness", outcome: "Identified anion composition as a modulator of metal fitness predictions across bacterial taxa", tag: "Geochemistry" },
  { title: "Ecotype Correlation Analysis", outcome: "Correlated ecotype classification with fitness phenotypes across environmental metagenomes", tag: "Ecology" },
  { title: "Ecotype Reanalysis: Environmental Samples", outcome: "Reanalyzed 800+ environmental samples revealing ecotype-specific metabolic signatures", tag: "Metagenomics" },
  { title: "ENIGMA Contamination & Functional Potential", outcome: "Linked contamination gradients to functional potential shifts in Oak Ridge field site metagenomes", tag: "Field Study" },
];

const TAG_COLORS: Record<string, string> = {
  "Multi-Omics": "#127dc3", "Genomics": "#6366f1", "Modeling": "#7c3aed",
  "AMR": "#dc2626", "Metabolism": "#ea580c", "Phenomics": "#d97706",
  "ML": "#0369a1", "Evolution": "#10b981", "Annotation": "#475569",
  "Pangenomics": "#9333ea", "Geochemistry": "#16a34a", "Ecology": "#0f766e",
  "Metagenomics": "#3b82f6", "Field Study": "#f59e0b",
};

const DATA_TABLES = [
  "kbase_ke_pangenome.genome", "kbase_ke_pangenome.gene_cluster",
  "kbase_ke_pangenome.gene_genecluster_junction", "kbase_ke_pangenome.eggnog_mapper_annotations",
  "kbase_ke_pangenome.bakta_amr", "kbase_ke_pangenome.gtdb_species_clade",
  "kbase_msd_biochemistry.reaction", "kbase_msd_biochemistry.compound",
  "kbase_uniref50", "kbase_uniref90", "kbase_uniref100",
  "kescience_fitnessbrowser.organism", "kescience_fitnessbrowser.fitness_experiment",
  "kescience_fitnessbrowser.gene_fitness", "kescience_bacdive.strain",
  "kescience_bacdive.phenotype", "phagefoundry_acinetobacter_genome_browser",
  "phagefoundry_phage_host_interaction", "enigma_field_samples.geochemistry",
  "enigma_field_samples.metagenome_assembly", "nmdc_biosample.metadata",
  "nmdc_metagenome.functional_annotation",
];

function getImpactScores(slug: string): { overall: number; dimensions: ImpactDimension[] } {
  if (slug === "adam-arkin") {
    return {
      overall: 96,
      dimensions: [
        { label: "Data Quality",       score: 98, color: "#127dc3", icon: "fa-shield-halved" },
        { label: "Research Output",    score: 97, color: "#6366f1", icon: "fa-flask" },
        { label: "Collaboration",      score: 95, color: "#10b981", icon: "fa-handshake" },
        { label: "Platform Activity",  score: 94, color: "#f59e0b", icon: "fa-bolt" },
      ],
    };
  }
  const rng = makeRng(slug + "-impact");
  const base = Math.floor(rng() * 35) + 55;
  const dims = [
    { label: "Data Quality",      score: Math.min(99, base + Math.floor(rng() * 12 - 4)), color: "#127dc3", icon: "fa-shield-halved" },
    { label: "Research Output",   score: Math.min(99, base + Math.floor(rng() * 12 - 4)), color: "#6366f1", icon: "fa-flask" },
    { label: "Collaboration",     score: Math.min(99, base + Math.floor(rng() * 12 - 4)), color: "#10b981", icon: "fa-handshake" },
    { label: "Platform Activity", score: Math.min(99, base + Math.floor(rng() * 12 - 4)), color: "#f59e0b", icon: "fa-bolt" },
  ];
  return { overall: Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length), dimensions: dims };
}

// ── Lookup tables ─────────────────────────────────────────────────────

const TENANT_LABELS: Record<string, string> = {
  kbase: "KBase", kessence: "KeScience", enigma: "ENIGMA", nmdc: "NMDC",
  phagefoundry: "PhageFoundry", planetmicrobe: "PlanetMicrobe",
  microbdiscoveryforge: "MicrobDiscoveryForge", pnnlsoil: "PnnlSoil",
  aile: "AIAle", asymbio: "Asymbio", ideas: "IDEAS",
  globalusers: "GlobalUsers", protect: "Protect", arkinlab: "ArkinLab",
};

const TENANT_INSTITUTIONS: Record<string, string> = {
  kbase: "Lawrence Berkeley National Laboratory",
  arkinlab: "Lawrence Berkeley National Laboratory",
  nmdc: "Lawrence Berkeley National Laboratory",
  phagefoundry: "Lawrence Berkeley National Laboratory",
  kessence: "Argonne National Laboratory",
  enigma: "Oak Ridge National Laboratory",
  planetmicrobe: "Brookhaven National Laboratory",
  microbdiscoveryforge: "Lawrence Berkeley National Laboratory",
  pnnlsoil: "Pacific Northwest National Laboratory",
};

const TENANT_COLORS: Record<string, string> = {
  kbase: "#127dc3", kessence: "#6366f1", enigma: "#7c3aed", nmdc: "#ea580c",
  phagefoundry: "#dc2626", planetmicrobe: "#0369a1", microbdiscoveryforge: "#16a34a",
  pnnlsoil: "#9333ea", aile: "#3b82f6", asymbio: "#10b981", ideas: "#d97706",
  globalusers: "#0f766e", protect: "#475569", arkinlab: "#0891b2",
};

const TENANT_MEMBERS: Record<string, TenantMember[]> = {
  kbase: [
    { name: "Adam Arkin",           jobTitle: "Lead PI",           role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/team-slider.jpg" },
    { name: "Gazi Mahmud",          jobTitle: "Architect Lead",    role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2024/02/mahmud-gazi.jpg" },
    { name: "Paramvir Dehal",       jobTitle: "Science Lead",      role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/dehal-paramvir_rev@2x.png" },
    { name: "Elisha Wood-Charlson", jobTitle: "Engagement Lead",   role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/EWC_LBL_headshot_refresh-scaled-e1677212010694.jpg" },
    { name: "Gavin Price",          jobTitle: "Bioinformaticist",  role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/price-gavin_rev@2x.png" },
  ],
  arkinlab: [
    { name: "Adam Arkin",           jobTitle: "Lead PI",           role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/team-slider.jpg" },
    { name: "Paramvir Dehal",       jobTitle: "Science Lead",      role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/dehal-paramvir_rev@2x.png" },
    { name: "Pavel Novichkov",      jobTitle: "Research Scientist", role: "member", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2024/02/novichkov-pavel-scaled.jpg" },
  ],
  kessence: [
    { name: "Adam Arkin",           jobTitle: "Lead PI",                  role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/team-slider.jpg" },
    { name: "Chris Henry",          jobTitle: "PI",                       role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/ChrisHenryPicture.jpg" },
    { name: "Janaka Edirisinghe",   jobTitle: "Computational Biologist",  role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/edirisinghe-janaka@2x-1.png" },
    { name: "Sam Seaver",           jobTitle: "Software Engineer",        role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/seaver-sam@2x.png" },
  ],
  enigma: [
    { name: "Adam Arkin",           jobTitle: "Lead PI",             role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/team-slider.jpg" },
    { name: "Bob Cottingham",       jobTitle: "PI",                  role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/cottingham-bob@2x.png" },
    { name: "Miriam Land",          jobTitle: "Bioinformatics Lead", role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/land-miriam_rev@2x.png" },
    { name: "Sean Jungbluth",       jobTitle: "Research Scientist",  role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/jungbluth-sean_rev@2x.png" },
  ],
  phagefoundry: [
    { name: "Adam Arkin",           jobTitle: "Lead PI",            role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/team-slider.jpg" },
    { name: "Shane Canon",          jobTitle: "Systems Architect",  role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/canon-shane@2x.png" },
    { name: "Dylan Chivian",        jobTitle: "Research Scientist", role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/chivian-dylan_rev@2x.png" },
  ],
  nmdc: [
    { name: "Doreen Ware",          jobTitle: "PI",                       role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/ware-doreen@2x.png" },
    { name: "Pamela Weisenhorn",    jobTitle: "Data Scientist",           role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/weisenhorn-pamela@2x.png" },
    { name: "Annette Greiner",      jobTitle: "Scientific Data Engineer", role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/greiner-annette_rev@2x.png" },
  ],
  planetmicrobe: [
    { name: "Shinjae Yoo",          jobTitle: "Computational Scientist", role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/yoo-shinjae@2x.png" },
    { name: "Ziming Yang",          jobTitle: "Research Scientist",      role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/09/yang-ziming.jpg-scaled-e1601491568798.jpg" },
  ],
  microbdiscoveryforge: [
    { name: "Pavel Novichkov",      jobTitle: "Research Scientist",       role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2024/02/novichkov-pavel-scaled.jpg" },
    { name: "John-Marc Chandonia",  jobTitle: "Bioinformatics Scientist", role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/chandonia-john-marc_rev@2x.png" },
    { name: "Roman Sutormin",       jobTitle: "Research Scientist",       role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2024/03/Sutormin-Roman.jpg" },
  ],
};

// ── Component ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const slug = username ?? "";

  const memberships: MemberProfile[] = [];
  for (const [tenant, members] of Object.entries(TENANT_MEMBERS)) {
    for (const m of members) {
      if (toSlug(m.name) === slug) memberships.push({ ...m, tenant });
    }
  }

  if (memberships.length === 0) {
    return (
      <div className="profile-not-found">
        <i className="fa-solid fa-circle-exclamation" />
        <p>Profile not found.</p>
        <Link to="/" className="profile-back-btn">Back to Workspace</Link>
      </div>
    );
  }

  const person = memberships[0];
  const primaryColor = TENANT_COLORS[memberships[0].tenant] ?? "#127dc3";
  const impact = getImpactScores(slug);
  const researchContribs = pick(RESEARCH_OUTCOMES, makeRng(slug + "-research"), 4);
  const dataTables = pick(DATA_TABLES, makeRng(slug + "-data"), 6);

  // Circumference for SVG ring (r=42)
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const dash = (impact.overall / 100) * CIRC;

  const institution = TENANT_INSTITUTIONS[memberships[0].tenant] ?? "Department of Energy";

  return (
    <div className="sp-page">

      {/* ── Cover ── */}
      <div className="sp-cover" style={{ background: `linear-gradient(135deg, ${primaryColor}dd 0%, ${primaryColor}66 60%, #0f172a 100%)` }}>
        <Link to={-1 as never} className="sp-back-btn">
          <i className="fa-solid fa-arrow-left" /> Back
        </Link>
      </div>

      {/* ── LinkedIn-style profile card ── */}
      <div className="sp-profile-card">
        <div className="sp-identity">
          <div className="sp-avatar-wrap">
            {person.photo
              ? <img src={person.photo} alt={person.name} className="sp-avatar" />
              : <div className="sp-avatar sp-avatar-initials" style={{ background: primaryColor }}>
                  {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
            }
            {memberships.some(m => m.role === "steward") && (
              <span className="sp-steward-badge" title="Data Steward">★</span>
            )}
          </div>

          <div className="sp-identity-main">
            <div className="sp-identity-info">
              <h1 className="sp-name">{person.name}</h1>
              <div className="sp-headline">{person.jobTitle}</div>
              <div className="sp-affiliation">
                <i className="fa-solid fa-building" /> {institution}
              </div>
              <div className="sp-tenant-badges">
                {memberships.map(m => (
                  <span key={m.tenant} className="sp-tenant-badge" style={{ background: `${TENANT_COLORS[m.tenant]}18`, color: TENANT_COLORS[m.tenant], borderColor: `${TENANT_COLORS[m.tenant]}44` }}>
                    {TENANT_LABELS[m.tenant] ?? m.tenant}
                    {m.role === "steward" && <span className="sp-badge-star">★</span>}
                  </span>
                ))}
              </div>
            </div>
            <div className="sp-identity-actions">
              <button className="sp-btn-primary" style={{ background: primaryColor }}>
                <i className="fa-solid fa-user-plus" /> Connect
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="sp-stats-strip">
          <div className="sp-stat">
            <div className="sp-stat-value" style={{ color: primaryColor }}>{impact.overall}</div>
            <div className="sp-stat-label">Impact Score</div>
          </div>
          <div className="sp-stat-divider" />
          <div className="sp-stat">
            <div className="sp-stat-value">{researchContribs.length}</div>
            <div className="sp-stat-label">Research Outcomes</div>
          </div>
          <div className="sp-stat-divider" />
          <div className="sp-stat">
            <div className="sp-stat-value">{dataTables.length}</div>
            <div className="sp-stat-label">Data Tables</div>
          </div>
          <div className="sp-stat-divider" />
          <div className="sp-stat">
            <div className="sp-stat-value">{memberships.length}</div>
            <div className="sp-stat-label">Tenant{memberships.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="sp-body">

        {/* ── LEFT column ── */}
        <aside className="sp-sidebar">

          {/* Impact ring card */}
          <div className="sp-card">
            <div className="sp-card-title"><i className="fa-solid fa-chart-line" /> K-BERDL Impact Score</div>
            <div className="sp-ring-wrap">
              <svg className="sp-ring-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={R} className="sp-ring-bg" />
                <circle cx="50" cy="50" r={R} className="sp-ring-fill"
                  style={{ stroke: primaryColor, strokeDasharray: `${dash} ${CIRC}` }}
                />
              </svg>
              <div className="sp-ring-label">
                <div className="sp-ring-num" style={{ color: primaryColor }}>{impact.overall}</div>
                <div className="sp-ring-sub">/ 100</div>
              </div>
            </div>
            <div className="sp-dims">
              {impact.dimensions.map(d => (
                <div key={d.label} className="sp-dim-row">
                  <i className={`fa-solid ${d.icon} sp-dim-icon`} style={{ color: d.color }} />
                  <span className="sp-dim-label">{d.label}</span>
                  <div className="sp-dim-bar-bg">
                    <div className="sp-dim-bar-fill" style={{ width: `${d.score}%`, background: d.color }} />
                  </div>
                  <span className="sp-dim-score" style={{ color: d.color }}>{d.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tenant memberships */}
          <div className="sp-card">
            <div className="sp-card-title"><i className="fa-solid fa-layer-group" /> Tenant Affiliations</div>
            <div className="sp-tenant-list">
              {memberships.map(m => {
                const c = TENANT_COLORS[m.tenant] ?? "#607d8b";
                return (
                  <div key={m.tenant} className="sp-tenant-row" style={{ borderLeftColor: c }}>
                    <div className="sp-tenant-dot" style={{ background: c }} />
                    <div>
                      <div className="sp-tenant-row-name" style={{ color: c }}>{TENANT_LABELS[m.tenant] ?? m.tenant}</div>
                      <div className={`sp-tenant-row-role ${m.role === "steward" ? "sp-role-steward" : "sp-role-member"}`}>
                        {m.role === "steward" ? "★ Data Steward" : "Member"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </aside>

        {/* ── RIGHT column: research + data feed ── */}
        <main className="sp-feed">
          <div className="sp-card-title sp-feed-title"><i className="fa-solid fa-flask" /> Research Contributions</div>
          {researchContribs.map((r, i) => (
            <div key={r.title} className="sp-feed-item">
              <div className="sp-feed-index" style={{ background: primaryColor }}>{i + 1}</div>
              <div className="sp-feed-body">
                <div className="sp-feed-header">
                  <span className="sp-feed-item-title">{r.title}</span>
                  <span className="sp-feed-tag" style={{ background: `${TAG_COLORS[r.tag] ?? "#607d8b"}18`, color: TAG_COLORS[r.tag] ?? "#607d8b" }}>{r.tag}</span>
                </div>
                <p className="sp-feed-outcome">{r.outcome}</p>
              </div>
            </div>
          ))}

          {/* Data contributions */}
          <div className="sp-card sp-data-card">
            <div className="sp-card-title"><i className="fa-solid fa-database" /> Data Contributions</div>
            <div className="sp-chips">
              {dataTables.map(t => (
                <span key={t} className="sp-chip"><i className="fa-solid fa-table sp-chip-icon" />{t}</span>
              ))}
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
