import { useParams, Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────

interface TenantMember {
  name: string;
  jobTitle: string;
  role: "member" | "steward";
  photo?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Simple seeded pseudo-RNG — consistent per username */
function makeRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0;
    return (h >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rng: () => number, n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

// ── Static data pools ─────────────────────────────────────────────────

const RESEARCH_OUTCOMES = [
  { title: "ADP1 Data Explorer", outcome: "Characterized 15-table multi-omics SQLite database with 461K rows across 6 data modalities" },
  { title: "ADP1 Deletion Phenotypes", outcome: "Identified 625 condition-specific genes mapping to expected metabolic pathways across 8 carbon sources" },
  { title: "ADP1 Triple Essentiality", outcome: "Analyzed FBA/TnSeq/growth concordance across 478 triple-covered genes revealing condition-specific discordance patterns" },
  { title: "Pan-Bacterial AMR Gene Atlas", outcome: "Catalogued AMR genes across 27,000 species and 132M gene clusters; identified resistance hotspots in Pseudomonadota and Bacillota" },
  { title: "Aromatic Catabolism Support Network", outcome: "Defined 51-gene support network for aromatic catabolism dominated by Complex I (41%)" },
  { title: "BacDive Metal Tolerance Validation", outcome: "Validated metal tolerance predictions against 97K BacDive strains; heavy metal isolates scored +1.00 SD higher" },
  { title: "BacDive Phenotype Signatures", outcome: "Demonstrated genome-encoded gene count (R²=0.63) dramatically outperforms phenotypic predictors for metal tolerance" },
  { title: "Co-fitness Predicts Co-inheritance", outcome: "Showed functional coupling constrains pangenome evolution across bacterial lineages" },
  { title: "COG Functional Category Analysis", outcome: "Mapped COG functional categories to fitness signatures across 100+ organisms in the fitness browser" },
  { title: "Gene Conservation & Fitness Synthesis", outcome: "Synthesized conservation and fitness data to identify universal vs. niche-specific essential genes" },
  { title: "Conservation vs Fitness", outcome: "Revealed that highly conserved genes are not necessarily fitness-critical under standard conditions" },
  { title: "Core Gene Burden Paradox", outcome: "Documented that core genome size inversely correlates with ecological generalism in certain clades" },
  { title: "Costly + Dispensable Genes", outcome: "Quantified energetic cost of maintaining dispensable genes and linked to genome streamlining pressures" },
  { title: "Counter Ion Effects on Metal Fitness", outcome: "Identified anion composition as a modulator of metal fitness predictions across bacterial taxa" },
  { title: "Ecotype Correlation Analysis", outcome: "Correlated ecotype classification with fitness phenotypes across environmental metagenomes" },
  { title: "Ecotype Reanalysis: Environmental Samples", outcome: "Reanalyzed 800+ environmental samples revealing ecotype-specific metabolic signatures" },
  { title: "ENIGMA Contamination & Functional Potential", outcome: "Linked contamination gradients to functional potential shifts in Oak Ridge field site metagenomes" },
];

const DATA_TABLES = [
  "kbase_ke_pangenome.genome",
  "kbase_ke_pangenome.gene_cluster",
  "kbase_ke_pangenome.gene_genecluster_junction",
  "kbase_ke_pangenome.eggnog_mapper_annotations",
  "kbase_ke_pangenome.bakta_amr",
  "kbase_ke_pangenome.gtdb_species_clade",
  "kbase_msd_biochemistry.reaction",
  "kbase_msd_biochemistry.compound",
  "kbase_uniref50",
  "kbase_uniref90",
  "kbase_uniref100",
  "kescience_fitnessbrowser.organism",
  "kescience_fitnessbrowser.fitness_experiment",
  "kescience_fitnessbrowser.gene_fitness",
  "kescience_bacdive.strain",
  "kescience_bacdive.phenotype",
  "phagefoundry_acinetobacter_genome_browser",
  "phagefoundry_phage_host_interaction",
  "enigma_field_samples.geochemistry",
  "enigma_field_samples.metagenome_assembly",
  "nmdc_biosample.metadata",
  "nmdc_metagenome.functional_annotation",
];

// ── Impact score sub-dimensions ───────────────────────────────────────

interface ImpactDimension {
  label: string;
  score: number;
  color: string;
}

function getImpactScores(slug: string): { overall: number; dimensions: ImpactDimension[] } {
  // Adam Arkin always gets a high score
  if (slug === "adam-arkin") {
    return {
      overall: 96,
      dimensions: [
        { label: "Data Quality",          score: 98, color: "#127dc3" },
        { label: "Research Output",        score: 97, color: "#6366f1" },
        { label: "Collaboration Index",    score: 95, color: "#10b981" },
        { label: "Platform Engagement",    score: 94, color: "#f59e0b" },
      ],
    };
  }
  const rng = makeRng(slug + "-impact");
  const base = Math.floor(rng() * 35) + 55; // 55–90
  const dims = [
    { label: "Data Quality",       score: Math.min(99, base + Math.floor(rng() * 12 - 4)), color: "#127dc3" },
    { label: "Research Output",    score: Math.min(99, base + Math.floor(rng() * 12 - 4)), color: "#6366f1" },
    { label: "Collaboration Index",score: Math.min(99, base + Math.floor(rng() * 12 - 4)), color: "#10b981" },
    { label: "Platform Engagement",score: Math.min(99, base + Math.floor(rng() * 12 - 4)), color: "#f59e0b" },
  ];
  return { overall: Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length), dimensions: dims };
}

// ── Member registry ───────────────────────────────────────────────────

const TENANT_LABELS: Record<string, string> = {
  kbase:                "KBase",
  kessence:             "KeScience",
  enigma:               "ENIGMA",
  nmdc:                 "NMDC",
  phagefoundry:         "PhageFoundry",
  planetmicrobe:        "PlanetMicrobe",
  microbdiscoveryforge: "MicrobDiscoveryForge",
  pnnlsoil:             "PnnlSoil",
  aile:                 "AIAle",
  asymbio:              "Asymbio",
  ideas:                "IDEAS",
  globalusers:          "GlobalUsers",
  protect:              "Protect",
};

const TENANT_COLORS: Record<string, string> = {
  kbase:                "#127dc3",
  kessence:             "#6366f1",
  enigma:               "#7c3aed",
  nmdc:                 "#ea580c",
  phagefoundry:         "#dc2626",
  planetmicrobe:        "#0369a1",
  microbdiscoveryforge: "#16a34a",
  pnnlsoil:             "#9333ea",
  aile:                 "#3b82f6",
  asymbio:              "#10b981",
  ideas:                "#d97706",
  globalusers:          "#0f766e",
  protect:              "#475569",
};

const TENANT_MEMBERS: Record<string, TenantMember[]> = {
  kbase: [
    { name: "Adam Arkin",          jobTitle: "Lead PI",          role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/team-slider.jpg" },
    { name: "Gazi Mahmud",         jobTitle: "Architect Lead",   role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2024/02/mahmud-gazi.jpg" },
    { name: "Paramvir Dehal",      jobTitle: "Science Lead",     role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/dehal-paramvir_rev@2x.png" },
    { name: "Elisha Wood-Charlson",jobTitle: "Engagement Lead",  role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/EWC_LBL_headshot_refresh-scaled-e1677212010694.jpg" },
    { name: "Gavin Price",         jobTitle: "Bioinformaticist", role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/price-gavin_rev@2x.png" },
  ],
  kessence: [
    { name: "Chris Henry",         jobTitle: "PI",                        role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/ChrisHenryPicture.jpg" },
    { name: "Janaka Edirisinghe",  jobTitle: "Computational Biologist",   role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/edirisinghe-janaka@2x-1.png" },
    { name: "Sam Seaver",          jobTitle: "Software Engineer",         role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/seaver-sam@2x.png" },
  ],
  enigma: [
    { name: "Bob Cottingham",      jobTitle: "PI",                  role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/cottingham-bob@2x.png" },
    { name: "Miriam Land",         jobTitle: "Bioinformatics Lead", role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/06/land-miriam_rev@2x.png" },
    { name: "Sean Jungbluth",      jobTitle: "Research Scientist",  role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/jungbluth-sean_rev@2x.png" },
  ],
  phagefoundry: [
    { name: "Shane Canon",         jobTitle: "Systems Architect",  role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/canon-shane@2x.png" },
    { name: "Dylan Chivian",       jobTitle: "Research Scientist", role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/chivian-dylan_rev@2x.png" },
  ],
  nmdc: [
    { name: "Doreen Ware",         jobTitle: "PI",                        role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/ware-doreen@2x.png" },
    { name: "Pamela Weisenhorn",   jobTitle: "Data Scientist",            role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/weisenhorn-pamela@2x.png" },
    { name: "Annette Greiner",     jobTitle: "Scientific Data Engineer",  role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/greiner-annette_rev@2x.png" },
  ],
  planetmicrobe: [
    { name: "Shinjae Yoo",         jobTitle: "Computational Scientist", role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/yoo-shinjae@2x.png" },
    { name: "Ziming Yang",         jobTitle: "Research Scientist",      role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/09/yang-ziming.jpg-scaled-e1601491568798.jpg" },
  ],
  microbdiscoveryforge: [
    { name: "Pavel Novichkov",     jobTitle: "Research Scientist",       role: "steward", photo: "https://www.kbase.us/wp-content/uploads/sites/6/2024/02/novichkov-pavel-scaled.jpg" },
    { name: "John-Marc Chandonia", jobTitle: "Bioinformatics Scientist", role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2020/07/chandonia-john-marc_rev@2x.png" },
    { name: "Roman Sutormin",      jobTitle: "Research Scientist",       role: "member",  photo: "https://www.kbase.us/wp-content/uploads/sites/6/2024/03/Sutormin-Roman.jpg" },
  ],
};

// ── Component ─────────────────────────────────────────────────────────

interface MemberProfile extends TenantMember {
  tenant: string;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const slug = username ?? "";

  const memberships: MemberProfile[] = [];
  for (const [tenant, members] of Object.entries(TENANT_MEMBERS)) {
    for (const m of members) {
      if (toSlug(m.name) === slug) {
        memberships.push({ ...m, tenant });
      }
    }
  }

  if (memberships.length === 0) {
    return (
      <div className="profile-not-found">
        <i className="fa-solid fa-circle-exclamation" /> Profile not found.
        <Link to="/" className="profile-back-link">Back to Workspace</Link>
      </div>
    );
  }

  const person = memberships[0];
  const impact = getImpactScores(slug);
  const researchContribs = pick(RESEARCH_OUTCOMES, makeRng(slug + "-research"), 4);
  const dataTables = pick(DATA_TABLES, makeRng(slug + "-data"), 5);

  return (
    <div className="profile-page">

      {/* ── Header ── */}
      <div className="profile-header">
        {person.photo
          ? <img src={person.photo} alt={person.name} className="profile-avatar" />
          : <div className="profile-avatar-initials">{person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
        }
        <div className="profile-header-info">
          <h1 className="profile-name">{person.name}</h1>
          <div className="profile-job-title">{person.jobTitle}</div>
        </div>
      </div>

      {/* ── Impact Score ── */}
      <section className="profile-section">
        <h2 className="profile-section-title"><i className="fa-solid fa-chart-line" /> K-BERDL Impact Score</h2>
        <div className="profile-impact-card">
          <div className="profile-impact-overall">
            <div className="profile-impact-number">{impact.overall}</div>
            <div className="profile-impact-label">Overall Score</div>
          </div>
          <div className="profile-impact-dims">
            {impact.dimensions.map((d) => (
              <div key={d.label} className="profile-impact-dim">
                <div className="profile-impact-dim-header">
                  <span className="profile-impact-dim-label">{d.label}</span>
                  <span className="profile-impact-dim-score" style={{ color: d.color }}>{d.score}</span>
                </div>
                <div className="profile-impact-bar-bg">
                  <div className="profile-impact-bar-fill" style={{ width: `${d.score}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Research Contributions ── */}
      <section className="profile-section">
        <h2 className="profile-section-title"><i className="fa-solid fa-flask" /> Research Contributions</h2>
        <div className="profile-research-list">
          {researchContribs.map((r) => (
            <div key={r.title} className="profile-research-item">
              <div className="profile-research-title">{r.title}</div>
              <div className="profile-research-outcome">{r.outcome}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data Contributions ── */}
      <section className="profile-section">
        <h2 className="profile-section-title"><i className="fa-solid fa-database" /> Data Contributions</h2>
        <ul className="profile-data-list">
          {dataTables.map((t) => (
            <li key={t} className="profile-data-item">
              <i className="fa-solid fa-table profile-data-icon" />{t}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Tenant Memberships ── */}
      <section className="profile-section">
        <h2 className="profile-section-title"><i className="fa-solid fa-layer-group" /> Tenant Memberships</h2>
        <div className="profile-tenants">
          {memberships.map((m) => {
            const color = TENANT_COLORS[m.tenant] ?? "#607d8b";
            return (
              <div key={m.tenant} className="profile-tenant-card" style={{ borderLeftColor: color }}>
                <div className="profile-tenant-name" style={{ color }}>{TENANT_LABELS[m.tenant] ?? m.tenant}</div>
                <div className={`profile-tenant-role ${m.role === "steward" ? "profile-role-steward" : "profile-role-member"}`}>
                  {m.role === "steward" ? "★ Data Steward" : "Member"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Link to={-1 as never} className="profile-back-link">
        <i className="fa-solid fa-arrow-left" /> Back
      </Link>
    </div>
  );
}
