import { useParams, Link } from "react-router-dom";

// ── Re-use the member registry from KnowledgeDashboardPage ────────────
// Member data is duplicated here to keep ProfilePage self-contained.

interface TenantMember {
  name: string;
  jobTitle: string;
  role: "member" | "steward";
  photo?: string;
}

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

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface MemberProfile extends TenantMember {
  tenant: string;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();

  // Find all tenant memberships for this slug
  const memberships: MemberProfile[] = [];
  for (const [tenant, members] of Object.entries(TENANT_MEMBERS)) {
    for (const m of members) {
      if (toSlug(m.name) === username) {
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

  return (
    <div className="profile-page">
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

      <section className="profile-section">
        <h2 className="profile-section-title"><i className="fa-solid fa-database" /> Tenant Memberships</h2>
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
