import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import Anthropic from "@anthropic-ai/sdk";
import { getTenants, type SqlResult } from "../api/client";

const STORAGE_KEY = "kberdl_anthropic_key";

const TABS = [
  { id: "tenants",   label: "K-BERDL Tenants",           icon: "fa-solid fa-layer-group" },
  { id: "coscience", label: "KBase Co-Scientist",         icon: "fa-solid fa-brain" },
  { id: "mdf",       label: "KBase Research Observatory", icon: "fa-solid fa-microscope" },
  { id: "feed",      label: "Knowledge Amplification Feed",     icon: "fa-solid fa-rss" },
];

// Display names for tenants that need specific casing
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

// Per-tenant colour accents for the card avatar
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

// Mock stats — replace with real API data when available
const MOCK_STATS: Record<string, { databases: number; tables: number; storage: string; access: string; restricted?: boolean }> = {
  aile:                 { databases: 9,  tables: 105, storage: "1.4 TB",  access: "Read·Write" },
  asymbio:              { databases: 4,  tables: 76,  storage: "210 GB",  access: "Read·Write", restricted: true },
  bravebread:           { databases: 4,  tables: 83,  storage: "480 GB",  access: "Read·Write" },
  enigma:               { databases: 9,  tables: 73,  storage: "2.5 TB",  access: "Read·Only"  },
  ese:                  { databases: 7,  tables: 40,  storage: "1.6 TB",  access: "Read·Write" },
  globalusers:          { databases: 6,  tables: 118, storage: "1.1 TB",  access: "Read·Write" },
  ideas:                { databases: 5,  tables: 36,  storage: "620 GB",  access: "Read·Write" },
  kbase:                { databases: 18, tables: 620, storage: "3.2 TB",  access: "Read·Write" },
  kessence:             { databases: 9,  tables: 80,  storage: "1.1 TB",  access: "Read·Write" },
  microbdiscoveryforge: { databases: 7,  tables: 90,  storage: "1.3 TB",  access: "Read·Write" },
  nmdc:                 { databases: 13, tables: 165, storage: "2.3 TB",  access: "Read·Write" },
  phagefoundry:         { databases: 5,  tables: 121, storage: "1.8 TB",  access: "Read·Only"  },
  planetmicrobe:        { databases: 3,  tables: 308, storage: "2.1 TB",  access: "Read·Write" },
  usgis:                { databases: 4,  tables: 76,  storage: "910 GB",  access: "Read·Write", restricted: true },
  pnnlsoil:             { databases: 6,  tables: 81,  storage: "480 GB",  access: "Read·Write" },
  protect:              { databases: 4,  tables: 72,  storage: "1.2 TB",  access: "Read·Only"  },
};

function TenantCard({ tenant, onViewDictionary, onOpenConsole }: { tenant: string; onViewDictionary: () => void; onOpenConsole: () => void }) {
  const navigate = useNavigate();
  const color = TENANT_COLORS[tenant] ?? "#607d8b";
  const stats = MOCK_STATS[tenant] ?? { databases: "—", tables: "—", storage: "—", access: "Read·Only" };
  const isWrite = stats.access === "Read·Write";

  return (
    <div className="tenant-card">
      <div className="tc-header">
        <div className="tc-avatar" style={{ background: color }}>
          {tenant[0].toUpperCase()}
        </div>
        <div className="tc-title-block">
          <span className="tc-name">{DISPLAY_NAMES[tenant] ?? tenant}</span>
          {stats.restricted && <span className="tc-badge tc-badge--restricted">Request Access</span>}
        </div>
        {!stats.restricted && (
          <span className={`tc-access ${isWrite ? "tc-access--write" : "tc-access--read"}`}>
            {stats.access}
          </span>
        )}
      </div>

      <div className="tc-stats">
        <div className="tc-stat">
          <span className="tc-stat-icon" style={{ color: "#127db3" }}>⬡</span>
          <span className="tc-stat-label">Databases</span>
          <span className="tc-stat-val">{stats.databases}</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-icon" style={{ color: "#8e44ad" }}>≡</span>
          <span className="tc-stat-label">Tables</span>
          <span className="tc-stat-val">{stats.tables}</span>
        </div>
        <div className="tc-stat">
          <span className="tc-stat-icon" style={{ color: "#16a085" }}>◈</span>
          <span className="tc-stat-label">Storage</span>
          <span className="tc-stat-val">{stats.storage}</span>
        </div>
      </div>

      <div className="tc-actions">
        <button className="tc-action" onClick={onViewDictionary}>
          📖 Data Catalog
        </button>
        <button className="tc-action" onClick={() => navigate(`/projects?tenant=${tenant}`)}>
          🔭 Discovery Catalog
        </button>
        <button className="tc-action" onClick={() => navigate(`/tenants/${tenant}`)}>
          📓 Launch Notebook
        </button>
        <button className="tc-action" onClick={onOpenConsole}>
          🖥 SQL Console
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────── DataDictionary data ─────────────────────

interface ColumnDef    { col_name: string; data_type: string; comment: string; }
interface TableDef     { name: string; columns: ColumnDef[]; }
interface DatabaseDef  { name: string; tables: TableDef[]; }
interface TenantDictInfo {
  description: string;
  steward: { name: string; email: string };
  members: string[];
  databases: DatabaseDef[];
}

const DICT_TABLES: Record<string, TableDef> = {
  genome: { name: "genome", columns: [
    { col_name: "genome_id",    data_type: "VARCHAR",   comment: "KBase genome object identifier" },
    { col_name: "taxon_id",     data_type: "VARCHAR",   comment: "NCBI taxon ID" },
    { col_name: "assembly_id",  data_type: "VARCHAR",   comment: "Assembly accession" },
    { col_name: "domain",       data_type: "VARCHAR",   comment: "Taxonomic domain (Bacteria, Archaea)" },
    { col_name: "gc_content",   data_type: "FLOAT",     comment: "GC content (%)" },
    { col_name: "num_contigs",  data_type: "INTEGER",   comment: "Number of contigs" },
    { col_name: "total_length", data_type: "BIGINT",    comment: "Total genome length (bp)" },
  ]},
  feature: { name: "feature", columns: [
    { col_name: "feature_id",  data_type: "VARCHAR",  comment: "Feature identifier" },
    { col_name: "genome_id",   data_type: "VARCHAR",  comment: "Parent genome" },
    { col_name: "type",        data_type: "VARCHAR",  comment: "Feature type (CDS, rRNA, tRNA)" },
    { col_name: "contig_id",   data_type: "VARCHAR",  comment: "Contig reference" },
    { col_name: "start",       data_type: "INTEGER",  comment: "Start position (1-based)" },
    { col_name: "end",         data_type: "INTEGER",  comment: "End position" },
    { col_name: "strand",      data_type: "CHAR(1)",  comment: "Strand direction (+/-)" },
    { col_name: "function",    data_type: "TEXT",     comment: "Functional annotation" },
  ]},
  annotation: { name: "annotation", columns: [
    { col_name: "annotation_id", data_type: "VARCHAR", comment: "Annotation record ID" },
    { col_name: "feature_id",    data_type: "VARCHAR", comment: "Associated feature" },
    { col_name: "ontology",      data_type: "VARCHAR", comment: "Ontology (GO, KEGG, COG)" },
    { col_name: "term",          data_type: "VARCHAR", comment: "Ontology term ID" },
    { col_name: "description",   data_type: "TEXT",    comment: "Term description" },
    { col_name: "evidence",      data_type: "VARCHAR", comment: "Evidence code" },
  ]},
  taxonomy: { name: "taxonomy", columns: [
    { col_name: "taxon_id",  data_type: "VARCHAR", comment: "NCBI taxon identifier" },
    { col_name: "name",      data_type: "VARCHAR", comment: "Scientific name" },
    { col_name: "rank",      data_type: "VARCHAR", comment: "Taxonomic rank" },
    { col_name: "parent_id", data_type: "VARCHAR", comment: "Parent taxon ID" },
    { col_name: "lineage",   data_type: "TEXT",    comment: "Full lineage string" },
  ]},
  sample: { name: "sample", columns: [
    { col_name: "sample_id",       data_type: "VARCHAR", comment: "Sample identifier" },
    { col_name: "genome_id",       data_type: "VARCHAR", comment: "Associated genome" },
    { col_name: "environment",     data_type: "VARCHAR", comment: "Environment type" },
    { col_name: "collection_date", data_type: "DATE",    comment: "Collection date" },
    { col_name: "latitude",        data_type: "FLOAT",   comment: "Geographic latitude" },
    { col_name: "longitude",       data_type: "FLOAT",   comment: "Geographic longitude" },
  ]},
  protein: { name: "protein", columns: [
    { col_name: "protein_id",    data_type: "VARCHAR",  comment: "Protein identifier" },
    { col_name: "feature_id",    data_type: "VARCHAR",  comment: "Source feature" },
    { col_name: "sequence_md5",  data_type: "CHAR(32)", comment: "MD5 of amino acid sequence" },
    { col_name: "length",        data_type: "INTEGER",  comment: "Protein length (aa)" },
    { col_name: "function",      data_type: "TEXT",     comment: "Predicted function" },
    { col_name: "domain_hits",   data_type: "INTEGER",  comment: "Number of Pfam domain hits" },
  ]},
  pangenome: { name: "pangenome", columns: [
    { col_name: "pangenome_id",    data_type: "VARCHAR", comment: "Pangenome identifier" },
    { col_name: "name",            data_type: "VARCHAR", comment: "Pangenome name" },
    { col_name: "num_genomes",     data_type: "INTEGER", comment: "Number of input genomes" },
    { col_name: "core_genes",      data_type: "INTEGER", comment: "Core gene families" },
    { col_name: "accessory_genes", data_type: "INTEGER", comment: "Accessory gene families" },
    { col_name: "method",          data_type: "VARCHAR", comment: "Clustering method" },
  ]},
  orthogroup: { name: "orthogroup", columns: [
    { col_name: "og_id",        data_type: "VARCHAR",  comment: "Orthogroup identifier" },
    { col_name: "pangenome_id", data_type: "VARCHAR",  comment: "Parent pangenome" },
    { col_name: "category",     data_type: "VARCHAR",  comment: "Core / accessory / unique" },
    { col_name: "num_genomes",  data_type: "INTEGER",  comment: "Genomes containing this OG" },
    { col_name: "function",     data_type: "TEXT",     comment: "Consensus function" },
    { col_name: "cog_category", data_type: "CHAR(1)",  comment: "COG functional category" },
  ]},
  kegg_pathway: { name: "kegg_pathway", columns: [
    { col_name: "pathway_id",   data_type: "VARCHAR", comment: "KEGG pathway ID" },
    { col_name: "name",         data_type: "VARCHAR", comment: "Pathway name" },
    { col_name: "category",     data_type: "VARCHAR", comment: "KEGG brite category" },
    { col_name: "gene_count",   data_type: "INTEGER", comment: "Genes in pathway" },
    { col_name: "completeness", data_type: "FLOAT",   comment: "Pathway completeness (%)" },
  ]},
  biosample: { name: "biosample", columns: [
    { col_name: "biosample_id",    data_type: "VARCHAR", comment: "NMDC biosample ID" },
    { col_name: "name",            data_type: "VARCHAR", comment: "Sample name" },
    { col_name: "env_broad_scale", data_type: "VARCHAR", comment: "Broad ecological context" },
    { col_name: "env_local_scale", data_type: "VARCHAR", comment: "Local environmental scale" },
    { col_name: "env_medium",      data_type: "VARCHAR", comment: "Environmental medium" },
    { col_name: "collection_date", data_type: "DATE",    comment: "Collection date" },
    { col_name: "depth_m",         data_type: "FLOAT",   comment: "Sampling depth (m)" },
  ]},
  metagenome: { name: "metagenome", columns: [
    { col_name: "metagenome_id", data_type: "VARCHAR", comment: "Assembly identifier" },
    { col_name: "sample_id",     data_type: "VARCHAR", comment: "Source sample" },
    { col_name: "total_bases",   data_type: "BIGINT",  comment: "Total base pairs" },
    { col_name: "num_contigs",   data_type: "INTEGER", comment: "Number of contigs" },
    { col_name: "n50",           data_type: "INTEGER", comment: "N50 contig length (bp)" },
    { col_name: "completeness",  data_type: "FLOAT",   comment: "Estimated completeness (%)" },
  ]},
  phage_genome: { name: "phage_genome", columns: [
    { col_name: "phage_id",      data_type: "VARCHAR", comment: "Phage genome identifier" },
    { col_name: "accession",     data_type: "VARCHAR", comment: "GenBank accession" },
    { col_name: "host_taxon_id", data_type: "VARCHAR", comment: "Host organism taxon ID" },
    { col_name: "genome_length", data_type: "INTEGER", comment: "Genome length (bp)" },
    { col_name: "lifestyle",     data_type: "VARCHAR", comment: "Lytic / lysogenic / temperate" },
    { col_name: "cluster",       data_type: "VARCHAR", comment: "Phage cluster assignment" },
  ]},
  geochemistry: { name: "geochemistry", columns: [
    { col_name: "geochem_id", data_type: "VARCHAR", comment: "Geochemistry record ID" },
    { col_name: "sample_id",  data_type: "VARCHAR", comment: "Associated sample" },
    { col_name: "analyte",    data_type: "VARCHAR", comment: "Chemical analyte measured" },
    { col_name: "value",      data_type: "FLOAT",   comment: "Measured value" },
    { col_name: "unit",       data_type: "VARCHAR", comment: "Measurement unit" },
    { col_name: "method",     data_type: "VARCHAR", comment: "Analytical method used" },
  ]},
  metabolomics: { name: "metabolomics", columns: [
    { col_name: "metabolite_id", data_type: "VARCHAR", comment: "Metabolite identifier" },
    { col_name: "sample_id",     data_type: "VARCHAR", comment: "Source sample" },
    { col_name: "compound",      data_type: "VARCHAR", comment: "Compound name" },
    { col_name: "abundance",     data_type: "FLOAT",   comment: "Relative abundance" },
    { col_name: "mz",            data_type: "FLOAT",   comment: "Mass-to-charge ratio" },
    { col_name: "rt_min",        data_type: "FLOAT",   comment: "Retention time (min)" },
  ]},
  expression: { name: "expression", columns: [
    { col_name: "expr_id",     data_type: "VARCHAR", comment: "Expression record ID" },
    { col_name: "feature_id",  data_type: "VARCHAR", comment: "Gene feature" },
    { col_name: "sample_id",   data_type: "VARCHAR", comment: "Experimental sample" },
    { col_name: "tpm",         data_type: "FLOAT",   comment: "Transcripts per million" },
    { col_name: "log2fc",      data_type: "FLOAT",   comment: "Log2 fold change" },
    { col_name: "padj",        data_type: "FLOAT",   comment: "Adjusted p-value" },
  ]},
};

// Sample rows keyed by table name (3 illustrative rows each)
const SAMPLE_DATA: Record<string, Record<string, unknown>[]> = {
  genome: [
    { genome_id: "GCF_000005845.2", taxon_id: "511145", assembly_id: "GCF_000005845", domain: "Bacteria", gc_content: 50.8, num_contigs: 1, total_length: 4641652 },
    { genome_id: "GCF_000009045.1", taxon_id: "224308", assembly_id: "GCF_000009045", domain: "Bacteria", gc_content: 43.5, num_contigs: 1, total_length: 4215606 },
    { genome_id: "GCF_000195955.2", taxon_id: "83332",  assembly_id: "GCF_000195955", domain: "Bacteria", gc_content: 65.6, num_contigs: 2, total_length: 4411532 },
  ],
  feature: [
    { feature_id: "b0001", genome_id: "GCF_000005845.2", type: "CDS",  contig_id: "NC_000913.3", start: 190,  end: 255,  strand: "+", function: "thr operon leader peptide" },
    { feature_id: "b0002", genome_id: "GCF_000005845.2", type: "CDS",  contig_id: "NC_000913.3", start: 337,  end: 2799, strand: "+", function: "threonine synthase" },
    { feature_id: "b0003", genome_id: "GCF_000005845.2", type: "rRNA", contig_id: "NC_000913.3", start: 4166, end: 4295, strand: "-", function: "16S ribosomal RNA" },
  ],
  annotation: [
    { annotation_id: "ANN-001", feature_id: "b0001", ontology: "GO",   term: "GO:0009088", description: "threonine biosynthetic process", evidence: "IEA" },
    { annotation_id: "ANN-002", feature_id: "b0002", ontology: "KEGG", term: "K01733",     description: "threonine synthase",            evidence: "IDA" },
    { annotation_id: "ANN-003", feature_id: "b0003", ontology: "COG",  term: "COG0460",   description: "homoserine kinase",              evidence: "IEA" },
  ],
  taxonomy: [
    { taxon_id: "511145", name: "Escherichia coli str. K-12 substr. MG1655", rank: "strain", parent_id: "83333", lineage: "Bacteria; Proteobacteria; Gammaproteobacteria; Enterobacteriaceae; Escherichia" },
    { taxon_id: "224308", name: "Bacillus subtilis str. 168",                 rank: "strain", parent_id: "1423",  lineage: "Bacteria; Firmicutes; Bacilli; Bacillales; Bacillaceae; Bacillus" },
    { taxon_id: "83332",  name: "Mycobacterium tuberculosis H37Rv",           rank: "strain", parent_id: "1773",  lineage: "Bacteria; Actinobacteria; Corynebacteriales; Mycobacteriaceae; Mycobacterium" },
  ],
  sample: [
    { sample_id: "SMP-001", genome_id: "GCF_000005845.2", environment: "freshwater",  collection_date: "2023-04-15", latitude: 37.87,  longitude: -122.26 },
    { sample_id: "SMP-002", genome_id: "GCF_000009045.1", environment: "soil",        collection_date: "2023-06-01", latitude: 39.10,  longitude: -77.15  },
    { sample_id: "SMP-003", genome_id: "GCF_000195955.2", environment: "human gut",   collection_date: "2022-11-30", latitude: null,   longitude: null    },
  ],
  protein: [
    { protein_id: "PRO-b0001", feature_id: "b0001", sequence_md5: "3e6c9bd9c0a28d5e", length: 21,  function: "thr operon leader peptide", domain_hits: 0 },
    { protein_id: "PRO-b0002", feature_id: "b0002", sequence_md5: "a1b2c3d4e5f67890", length: 428, function: "threonine synthase",          domain_hits: 2 },
    { protein_id: "PRO-b0003", feature_id: "b0003", sequence_md5: "f9e8d7c6b5a43210", length: 820, function: "aspartate kinase",             domain_hits: 4 },
  ],
  pangenome: [
    { pangenome_id: "PAN-001", name: "E. coli K-12 Pangenome",    num_genomes: 85, core_genes: 3187, accessory_genes: 14203, method: "OrthoFinder" },
    { pangenome_id: "PAN-002", name: "B. subtilis Pangenome",      num_genomes: 42, core_genes: 2541, accessory_genes: 5892,  method: "Roary"       },
    { pangenome_id: "PAN-003", name: "Streptomyces Pangenome",     num_genomes: 67, core_genes: 4102, accessory_genes: 22890, method: "PIRATE"      },
  ],
  orthogroup: [
    { og_id: "OG0000001", pangenome_id: "PAN-001", category: "core",      num_genomes: 85, function: "DNA replication initiation", cog_category: "L" },
    { og_id: "OG0000042", pangenome_id: "PAN-001", category: "accessory", num_genomes: 31, function: "colicin immunity protein",   cog_category: "V" },
    { og_id: "OG0000107", pangenome_id: "PAN-001", category: "unique",    num_genomes: 1,  function: "hypothetical protein",        cog_category: "S" },
  ],
  kegg_pathway: [
    { pathway_id: "ko00260", name: "Glycine, serine and threonine metabolism", category: "Amino acid metabolism",    gene_count: 23, completeness: 91.3 },
    { pathway_id: "ko00010", name: "Glycolysis / Gluconeogenesis",             category: "Carbohydrate metabolism",  gene_count: 28, completeness: 85.7 },
    { pathway_id: "ko00620", name: "Pyruvate metabolism",                      category: "Carbohydrate metabolism",  gene_count: 15, completeness: 73.3 },
  ],
  biosample: [
    { biosample_id: "BIOSMP-001", name: "Rifle CO aquifer sediment", env_broad_scale: "subsurface",  env_local_scale: "aquifer", env_medium: "sediment", collection_date: "2023-03-10", depth_m: 4.5 },
    { biosample_id: "BIOSMP-002", name: "EMSL soil core",            env_broad_scale: "terrestrial", env_local_scale: "soil",    env_medium: "soil",     collection_date: "2023-07-22", depth_m: 0.1 },
    { biosample_id: "BIOSMP-003", name: "Walker Branch watershed",   env_broad_scale: "freshwater",  env_local_scale: "stream",  env_medium: "water",    collection_date: "2022-09-14", depth_m: 0.3 },
  ],
  metagenome: [
    { metagenome_id: "MGS-001", sample_id: "SMP-001", total_bases: 5400000000, num_contigs: 187432, n50: 1842, completeness: 78.4 },
    { metagenome_id: "MGS-002", sample_id: "SMP-002", total_bases: 3200000000, num_contigs: 94810,  n50: 2205, completeness: 82.1 },
    { metagenome_id: "MGS-003", sample_id: "SMP-003", total_bases: 7800000000, num_contigs: 312900, n50: 1105, completeness: 71.6 },
  ],
  phage_genome: [
    { phage_id: "PHG-001", accession: "MN636521", host_taxon_id: "1280", genome_length: 43720, lifestyle: "lytic",     cluster: "A1" },
    { phage_id: "PHG-002", accession: "KU513279", host_taxon_id: "1773", genome_length: 52810, lifestyle: "temperate", cluster: "C2" },
    { phage_id: "PHG-003", accession: "MH370511", host_taxon_id: "287",  genome_length: 38450, lifestyle: "lysogenic", cluster: "B3" },
  ],
  geochemistry: [
    { geochem_id: "GC-001", sample_id: "SMP-001", analyte: "dissolved_oxygen", value: 2.3,  unit: "mg/L",      method: "Winkler titration" },
    { geochem_id: "GC-002", sample_id: "SMP-001", analyte: "sulfate",          value: 14.8, unit: "mmol/L",    method: "IC"                },
    { geochem_id: "GC-003", sample_id: "SMP-002", analyte: "pH",               value: 6.7,  unit: "pH units",  method: "electrode"         },
  ],
  metabolomics: [
    { metabolite_id: "MET-001", sample_id: "SMP-001", compound: "acetate",    abundance: 1.24e6, mz: 59.013,  rt_min: 1.82 },
    { metabolite_id: "MET-002", sample_id: "SMP-001", compound: "succinate",  abundance: 8.71e5, mz: 117.019, rt_min: 3.44 },
    { metabolite_id: "MET-003", sample_id: "SMP-002", compound: "malate",     abundance: 2.15e6, mz: 133.014, rt_min: 4.11 },
  ],
  expression: [
    { expr_id: "EXP-001", feature_id: "b0002", sample_id: "SMP-001", tpm: 142.7, log2fc:  2.31, padj: 0.0012 },
    { expr_id: "EXP-002", feature_id: "b0003", sample_id: "SMP-001", tpm: 87.4,  log2fc: -1.15, padj: 0.0341 },
    { expr_id: "EXP-003", feature_id: "b0001", sample_id: "SMP-002", tpm: 5.2,   log2fc:  0.08, padj: 0.8820 },
  ],
};

function t(...names: string[]): TableDef[] {
  return names.map((n) => DICT_TABLES[n]);
}

function db(name: string, ...tableNames: string[]): DatabaseDef {
  return { name, tables: t(...tableNames) };
}

const TENANT_DICT_INFO: Record<string, TenantDictInfo> = {
  kbase: {
    description: "Core KBase genomics platform housing curated genomes, annotations, and functional genomics data across diverse microbial communities.",
    steward: { name: "Adam Arkin", email: "aarkin@lbl.gov" },
    members: ["Chris H.", "Tian T.", "Shane C.", "Paramvir D.", "Shinjae Y."],
    databases: [
      db("kbase_genomes",               "genome", "feature", "annotation", "taxonomy"),
      db("kbase_pangenome",             "pangenome", "orthogroup", "genome", "feature"),
      db("kbase_functional_annotations","annotation", "kegg_pathway", "protein"),
      db("kbase_metabolic_models",      "genome", "annotation", "protein"),
      db("kbase_metagenomes",           "metagenome", "sample", "taxonomy", "annotation"),
      db("kbase_expression_data",       "expression", "feature", "sample"),
    ],
  },
  nmdc: {
    description: "National Microbiome Data Collaborative repository integrating metagenomics, metabolomics, and environmental metadata.",
    steward: { name: "Emiley Eloe-Fadrosh", email: "eaeloe@lbl.gov" },
    members: ["Kjiersten F.", "Mark M.", "Patrick C.", "Montana B.", "Elisha W."],
    databases: [
      db("nmdc_biosamples",            "biosample", "sample", "geochemistry"),
      db("nmdc_metagenome_assemblies", "metagenome", "genome", "annotation"),
      db("nmdc_metabolomics",          "metabolomics", "sample"),
      db("nmdc_flattened_biosamples",  "biosample", "taxonomy", "annotation", "kegg_pathway"),
      db("nmdc_workflows",             "metagenome", "protein", "feature"),
    ],
  },
  enigma: {
    description: "Ecosystems & Networks Integrated with Genes & Molecular Assemblies — field-scale microbial ecology from contaminated DOE sites.",
    steward: { name: "Terry Hazen", email: "tchazen@utk.edu" },
    members: ["Romy N.", "Susannah T.", "Kenneth W.", "Lauren S.", "Egbert V."],
    databases: [
      db("enigma_field_samples",       "sample", "geochemistry", "biosample"),
      db("enigma_metagenomes",         "metagenome", "genome", "annotation"),
      db("enigma_metabolomics",        "metabolomics", "sample"),
      db("enigma_transcriptomics",     "expression", "feature", "annotation"),
      db("enigma_geochemistry",        "geochemistry", "sample"),
      db("enigma_comparative_genomics","genome", "taxonomy", "annotation"),
    ],
  },
  microbdiscoveryforge: {
    description: "Microbial Discovery Forge — pangenome analysis and comparative genomics across microbial dark matter and novel lineages.",
    steward: { name: "Nikos Kyrpides", email: "nkyrpides@lbl.gov" },
    members: ["Emiley E.", "Marcel K.", "Supratim M.", "Uri G."],
    databases: [
      db("mdf_pangenomes",         "pangenome", "orthogroup", "genome"),
      db("mdf_comparative_genomics","genome", "feature", "annotation", "taxonomy"),
      db("mdf_protein_families",   "protein", "annotation", "kegg_pathway"),
      db("mdf_novel_lineages",     "genome", "taxonomy", "sample"),
    ],
  },
  phagefoundry: {
    description: "PhageFoundry bacteriophage genomics database housing phage genomes, host-range data, and functional annotations.",
    steward: { name: "Jillian Banfield", email: "jfbanfield@berkeley.edu" },
    members: ["David E.", "Rohan A.", "Basem A.", "Simon R."],
    databases: [
      db("phagefoundry_phage_genomes",          "phage_genome", "genome", "taxonomy"),
      db("phagefoundry_acinetobacter_genome_browser", "phage_genome", "feature", "annotation"),
      db("phagefoundry_host_range",             "genome", "taxonomy", "sample"),
      db("phagefoundry_protein_clusters",       "protein", "annotation", "feature"),
    ],
  },
  planetmicrobe: {
    description: "Ocean and marine microbiome datasets from global expeditions integrated with oceanographic metadata.",
    steward: { name: "Matthew Sullivan", email: "sullivan.948@osu.edu" },
    members: ["Jennifer B.", "Ann G.", "Simon R.", "Bonnie S."],
    databases: [
      db("planetmicrobe_ocean_samples", "biosample", "sample", "geochemistry"),
      db("planetmicrobe_metagenomes",   "metagenome", "genome", "taxonomy"),
      db("planetmicrobe_metabolomics",  "metabolomics", "protein", "kegg_pathway"),
    ],
  },
  aile: {
    description: "AI-driven Literature Engine datasets linking published microbial research to experimental evidence and genomic context.",
    steward: { name: "Elisha Wood-Charlson", email: "elishawc@lbl.gov" },
    members: ["Paramvir D.", "Chris H.", "Ben A."],
    databases: [
      db("aile_genomics",      "genome", "annotation", "feature", "taxonomy"),
      db("aile_expression",    "expression", "feature", "sample"),
      db("aile_kegg_pathways", "kegg_pathway", "annotation"),
    ],
  },
  asymbio: {
    description: "Asymbiote biology research collections focusing on host-microbe interaction dynamics and symbiosis pathway analysis.",
    steward: { name: "Nandita Garud", email: "ngarud@ucla.edu" },
    members: ["Oscar H.", "Priya K.", "Wei Z."],
    databases: [
      db("asymbio_host_microbiome", "genome", "sample", "taxonomy"),
      db("asymbio_symbiosis",       "feature", "annotation", "expression"),
      db("asymbio_genome_features", "genome", "feature", "annotation", "taxonomy"),
    ],
  },
  bravebread: {
    description: "Bread microbiome research datasets characterizing sourdough and fermentation community dynamics and metabolite profiles.",
    steward: { name: "Benjamin Wolfe", email: "bwolfe@tufts.edu" },
    members: ["Rachel D.", "Liz C.", "Marcus T."],
    databases: [
      db("bravebread_fermentation",  "sample", "metagenome", "taxonomy"),
      db("bravebread_metabolomics",  "metabolomics", "sample"),
      db("bravebread_genomics",      "genome", "annotation"),
    ],
  },
  ese: {
    description: "Environmental Systems Ecology datasets from terrestrial and aquatic ecosystem monitoring studies across BER sites.",
    steward: { name: "Janet Jansson", email: "janet.jansson@pnnl.gov" },
    members: ["Kirsten B.", "James T.", "Malak H.", "Ryan M."],
    databases: [
      db("ese_ecosystem_samples", "sample", "geochemistry", "biosample"),
      db("ese_metagenomes",       "metagenome", "genome", "taxonomy"),
      db("ese_metabolomics",      "metabolomics", "sample"),
      db("ese_transcriptomics",   "expression", "feature"),
      db("ese_genome_features",   "genome", "annotation", "taxonomy"),
    ],
  },
  globalusers: {
    description: "Shared global user workspace for cross-tenant collaboration, reference datasets, and platform-wide utility tables.",
    steward: { name: "K-BERDL Platform Team", email: "kberdl@kbase.us" },
    members: ["Admin U.", "Support T.", "Ops E."],
    databases: [
      db("globalusers_reference_genomes", "genome", "feature", "annotation"),
      db("globalusers_taxonomy",          "taxonomy", "sample"),
      db("globalusers_kegg_annotations",  "kegg_pathway", "annotation", "protein"),
      db("globalusers_protein_sequences", "protein", "feature"),
    ],
  },
  ideas: {
    description: "Integrated Data for Environmental and Agricultural Systems — crop-associated microbiome and soil health datasets.",
    steward: { name: "Susannah Tringe", email: "sgtringe@lbl.gov" },
    members: ["Eoin B.", "Tijana G.", "Mary-Ann M.", "Lee A."],
    databases: [
      db("ideas_soil_samples",   "sample", "geochemistry", "biosample"),
      db("ideas_crop_microbiome","metagenome", "genome", "taxonomy"),
      db("ideas_metabolomics",   "metabolomics", "sample"),
      db("ideas_geochemistry",   "geochemistry", "sample", "annotation"),
    ],
  },
  kessence: {
    description: "KeScience platform data collections for high-throughput phenotypic screening and systems biology experiments.",
    steward: { name: "Aindrila Mukhopadhyay", email: "amukhopadhyay@lbl.gov" },
    members: ["Eric S.", "Jon R.", "Fang L.", "Sam B."],
    databases: [
      db("kescience_phenotypic",       "genome", "feature", "annotation"),
      db("kescience_expression",       "expression", "feature", "sample"),
      db("kescience_bacdive",          "biosample", "taxonomy", "sample"),
      db("kescience_protein_analysis", "protein", "kegg_pathway", "annotation"),
    ],
  },
  pnnlsoil: {
    description: "PNNL Soil microbiome research collections from the Columbia River watershed, Hanford site, and rhizosphere studies.",
    steward: { name: "James Stegen", email: "james.stegen@pnnl.gov" },
    members: ["Hyun-Seob S.", "Bill C.", "Vanessa G.", "Rosalie A."],
    databases: [
      db("pnnlsoil_columbia_river", "sample", "geochemistry", "metagenome"),
      db("pnnlsoil_hanford_site",   "sample", "geochemistry", "genome"),
      db("pnnlsoil_rhizosphere",    "sample", "metagenome", "taxonomy"),
      db("pnnlsoil_metabolomics",   "metabolomics", "geochemistry", "sample"),
    ],
  },
  protect: {
    description: "Genome-scale metabolic models and functional genomics data for protective and probiotic microbial strains.",
    steward: { name: "Eleanor Vance", email: "eleanor@kbase.us" },
    members: ["Alexa P.", "Hassan K.", "Fatima S.", "Skertan L.", "Marvis V."],
    databases: [
      db("protect_metabolic_models",    "genome", "annotation", "kegg_pathway"),
      db("protect_probiotic_genomes",   "genome", "feature", "protein"),
      db("protect_comparative_genomics","pangenome", "orthogroup", "taxonomy"),
    ],
  },
  usgis: {
    description: "U.S. Geological and Interdisciplinary Science datasets linking geospatial microbiome data with subsurface profiles.",
    steward: { name: "Patricia Holden", email: "holden@ucsb.edu" },
    members: ["Derek F.", "Anna W.", "Kevin L.", "Tara J."],
    databases: [
      db("usgis_geospatial",  "sample", "geochemistry", "biosample"),
      db("usgis_subsurface",  "sample", "metagenome", "genome"),
      db("usgis_microbiome",  "genome", "taxonomy", "annotation"),
    ],
  },
};

const MEMBER_COLORS = ["#3b82f6","#10b981","#f97316","#7c3aed","#ec4899","#0891b2","#d97706","#16a34a"];

function initials(name: string) {
  return name.split(" ").filter(p => /^[A-Z]/.test(p)).map(p => p[0]).join("").slice(0, 2);
}

// ─────────────────────────── DataDictionaryView ───────────────────────

function DataDictionaryView({ tenant, onBack }: { tenant: string; onBack: () => void }) {
  const dict = TENANT_DICT_INFO[tenant] ?? {
    description: `${DISPLAY_NAMES[tenant] ?? tenant} data collections.`,
    steward: { name: "K-BERDL Admin", email: "kberdl@kbase.us" },
    members: ["Admin U."],
    databases: [db("default", "genome", "feature", "annotation", "taxonomy", "sample")],
  };
  const color   = TENANT_COLORS[tenant] ?? "#607d8b";
  const display = DISPLAY_NAMES[tenant] ?? tenant;
  const stats   = MOCK_STATS[tenant];
  const isWrite = stats?.access === "Read·Write";

  const [selectedDb,    setSelectedDb]    = useState<string>(dict.databases[0]?.name ?? "");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schemaView,    setSchemaView]    = useState<"schema" | "sample">("schema");

  // Reset selections when tenant changes
  useEffect(() => {
    setSelectedDb(dict.databases[0]?.name ?? "");
    setSelectedTable(null);
    setSchemaView("schema");
  }, [tenant]);

  // Reset tab when table changes
  useEffect(() => { setSchemaView("schema"); }, [selectedTable]);

  const activeDb   = dict.databases.find(d => d.name === selectedDb);
  const schema     = activeDb?.tables.find(tb => tb.name === selectedTable);
  const totalTables = dict.databases.reduce((sum, d) => sum + d.tables.length, 0);

  return (
    <div className="dd-page">
      <button className="dd-back-btn" onClick={onBack}>
        <i className="fa-solid fa-arrow-left" /> Back to Tenants
      </button>

      {/* ── Hero ── */}
      <div className="dd-hero" style={{ borderTopColor: color }}>
        <div className="dd-hero-left">
          <div className="dd-hero-avatar" style={{ background: color }}>
            {tenant[0].toUpperCase()}
          </div>
          <div className="dd-hero-text">
            <p className="dd-hero-eyebrow">Data Dictionary</p>
            <h2 className="dd-hero-name">{display}</h2>
            <p className="dd-hero-desc">{dict.description}</p>
          </div>
        </div>

        {stats && (
          <div className="dd-hero-right">
            <div className="dd-stat-group">
              <div className="dd-stat">
                <span className="dd-stat-val">{stats.databases}</span>
                <span className="dd-stat-lbl">Databases</span>
              </div>
              <div className="dd-stat-divider" />
              <div className="dd-stat">
                <span className="dd-stat-val">{stats.tables}</span>
                <span className="dd-stat-lbl">Tables</span>
              </div>
              <div className="dd-stat-divider" />
              <div className="dd-stat">
                <span className="dd-stat-val">{stats.storage}</span>
                <span className="dd-stat-lbl">Storage</span>
              </div>
            </div>
            <span className={`dd-access-pill ${isWrite ? "dd-access-pill--write" : "dd-access-pill--read"}`}>
              {stats.access}
            </span>
          </div>
        )}
      </div>

      {/* ── Steward + Members ── */}
      <div className="dd-info-row">
        <div className="dd-info-card">
          <span className="dd-card-label">Data Steward</span>
          <div className="dd-steward-body">
            <div className="dd-lg-avatar" style={{ background: "#475569" }}>
              {initials(dict.steward.name)}
            </div>
            <div>
              <div className="dd-person-name">{dict.steward.name}</div>
              <div className="dd-person-email">{dict.steward.email}</div>
            </div>
          </div>
        </div>

        <div className="dd-info-card dd-info-card--grow">
          <span className="dd-card-label">Team Members</span>
          <div className="dd-members-wrap">
            {dict.members.map((m, i) => (
              <div key={m} className="dd-member-chip">
                <div className="dd-chip-avatar" style={{ background: MEMBER_COLORS[i % MEMBER_COLORS.length] }}>
                  {initials(m)}
                </div>
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Data Dictionary — 3 panels ── */}
      <div className="dd-dict-section">
        <div className="dd-dict-hd">
          <span className="dd-card-label" style={{ margin: 0 }}>Data Dictionary</span>
          <span className="dd-badge">{dict.databases.length} databases · {totalTables} tables</span>
        </div>
        <div className="dd-dict-body">

          {/* Panel 1 — Databases */}
          <div className="dd-panel">
            <div className="dd-panel-hd">
              <i className="fa-solid fa-database" />
              <span>Databases</span>
              <span className="dd-badge" style={{ marginLeft: "auto" }}>{dict.databases.length}</span>
            </div>
            <div className="dd-table-list">
              {dict.databases.map(d => (
                <div
                  key={d.name}
                  className={`dd-table-row${selectedDb === d.name ? " dd-table-row--active" : ""}`}
                  style={selectedDb === d.name ? { borderLeftColor: color } : {}}
                  onClick={() => { setSelectedDb(d.name); setSelectedTable(null); }}
                >
                  <i className="fa-solid fa-database" />
                  <span>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 2 — Tables */}
          <div className="dd-panel">
            <div className="dd-panel-hd">
              <i className="fa-solid fa-layer-group" />
              <span>Tables</span>
              {activeDb && <span className="dd-badge" style={{ marginLeft: "auto" }}>{activeDb.tables.length}</span>}
            </div>
            {!activeDb ? (
              <div className="dd-schema-empty">
                <i className="fa-solid fa-database" />
                <span>Select a database first</span>
              </div>
            ) : (
              <div className="dd-table-list">
                {activeDb.tables.map(tb => (
                  <div
                    key={tb.name}
                    className={`dd-table-row${selectedTable === tb.name ? " dd-table-row--active" : ""}`}
                    style={selectedTable === tb.name ? { borderLeftColor: color } : {}}
                    onClick={() => setSelectedTable(tb.name)}
                  >
                    <i className="fa-solid fa-table-list" />
                    <span>{tb.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel 3 — Schema / Sample Data */}
          <div className="dd-panel">
            <div className="dd-panel-hd">
              <i className="fa-solid fa-code" />
              <span>{schema ? schema.name : "Schema"}</span>
              {schema && <span className="dd-badge" style={{ marginLeft: "auto" }}>{schema.columns.length} cols</span>}
            </div>

            {schema && (
              <div className="dd-view-tabs">
                <button
                  className={`dd-view-tab${schemaView === "schema" ? " dd-view-tab--active" : ""}`}
                  onClick={() => setSchemaView("schema")}
                >
                  <i className="fa-solid fa-list-ul" /> Schema
                </button>
                <button
                  className={`dd-view-tab${schemaView === "sample" ? " dd-view-tab--active" : ""}`}
                  onClick={() => setSchemaView("sample")}
                >
                  <i className="fa-solid fa-table" /> Sample Data
                </button>
              </div>
            )}

            {!schema ? (
              <div className="dd-schema-empty">
                <i className="fa-solid fa-arrow-pointer" />
                <span>Select a table to view its schema</span>
              </div>
            ) : schemaView === "schema" ? (
              <table className="dd-schema-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.columns.map((col, idx) => (
                    <tr key={col.col_name} className={idx % 2 === 0 ? "dd-row-even" : ""}>
                      <td className="dd-col-name">{col.col_name}</td>
                      <td><span className="dd-type-pill">{col.data_type}</span></td>
                      <td className="dd-col-comment">{col.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              (() => {
                const rows = SAMPLE_DATA[schema.name] ?? [];
                return rows.length === 0 ? (
                  <div className="dd-schema-empty">
                    <i className="fa-solid fa-circle-info" />
                    <span>No sample data available for this table</span>
                  </div>
                ) : (
                  <div className="dd-sample-wrap">
                    <table className="dd-schema-table dd-sample-table">
                      <thead>
                        <tr>
                          {schema.columns.map(col => (
                            <th key={col.col_name}>{col.col_name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? "dd-row-even" : ""}>
                            {schema.columns.map(col => {
                              const val = row[col.col_name];
                              return (
                                <td key={col.col_name} className="dd-sample-cell">
                                  {val === null || val === undefined
                                    ? <span className="dd-null">null</span>
                                    : String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── SQLConsoleView ──────────────────────────

const SQL_PAGE_SIZE = 20;

const DEFAULT_NL_PROMPT =
  "produces a species-level snapshot of genome inventory and pangenome complexity, " +
  "suitable for downstream visualization or comparative genomics analysis. " +
  "Use the kbase_ke_pangenome database";

const DEFAULT_QUERY = `SELECT
    s.clade_id AS gtdb_species_clade_id,
    sc.GTDB_species,
    p.no_genomes,
    p.no_core,
    p.no_singleton_gene_clusters,
    p.no_gene_clusters
FROM kbase_ke_pangenome.pangenome p
JOIN kbase_ke_pangenome.gtdb_species_clade sc
    USING (gtdb_species_clade_id)
JOIN (
    SELECT
        gtdb_species_clade_id AS clade_id
    FROM kbase_ke_pangenome.gene_cluster
    GROUP BY 1
) s
    ON s.clade_id = p.gtdb_species_clade_id
ORDER BY
    p.no_genomes DESC`;

const MOCK_SQL_COLUMNS = [
  "gtdb_species_clade_id",
  "GTDB_species",
  "no_genomes",
  "no_core",
  "no_singleton_gene_clusters",
  "no_gene_clusters",
];

const MOCK_SQL_ROWS: string[][] = [
  ["1",  "s__Escherichia coli",              "15234", "3187", "42891", "89423"],
  ["2",  "s__Klebsiella pneumoniae",         "8921",  "4102", "31240", "67891"],
  ["3",  "s__Salmonella enterica",           "7654",  "4891", "28103", "58234"],
  ["4",  "s__Pseudomonas aeruginosa",        "6234",  "4210", "22341", "53120"],
  ["5",  "s__Staphylococcus aureus",         "5892",  "2891", "18234", "41023"],
  ["6",  "s__Bacillus subtilis",             "4123",  "3456", "15234", "38901"],
  ["7",  "s__Acinetobacter baumannii",       "3891",  "3102", "19234", "44230"],
  ["8",  "s__Streptococcus pneumoniae",      "3456",  "2134", "14230", "31089"],
  ["9",  "s__Clostridioides difficile",      "2891",  "3234", "12103", "28934"],
  ["10", "s__Vibrio cholerae",               "2345",  "3891", "10234", "25678"],
  ["11", "s__Listeria monocytogenes",        "2103",  "2891",  "7234", "18902"],
  ["12", "s__Enterococcus faecalis",         "1892",  "2456",  "8901", "22341"],
  ["13", "s__Mycobacterium tuberculosis",    "1654",  "3892",  "4231", "12089"],
  ["14", "s__Helicobacter pylori",           "1423",  "1234",  "8901", "19234"],
  ["15", "s__Campylobacter jejuni",          "1234",  "1892",  "6234", "15891"],
  ["16", "s__Neisseria gonorrhoeae",          "987",  "1654",  "5892", "13234"],
  ["17", "s__Haemophilus influenzae",         "876",  "1892",  "4231", "10892"],
  ["18", "s__Burkholderia pseudomallei",      "754",  "5234",  "8901", "21034"],
  ["19", "s__Yersinia pestis",                "623",  "4102",  "3456", "10234"],
  ["20", "s__Francisella tularensis",         "312",  "1654",  "2103",  "6234"],
];

function mockExecuteSql(): Promise<SqlResult> {
  const delay = 800 + Math.random() * 600;
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          columns:    MOCK_SQL_COLUMNS,
          rows:       MOCK_SQL_ROWS,
          elapsed_ms: Math.round(delay),
        }),
      delay,
    ),
  );
}

function SQLConsoleView({ tenant, onBack }: { tenant: string; onBack: () => void }) {
  const [query,      setQuery]      = useState("");
  const [status,     setStatus]     = useState<"idle" | "running" | "done" | "error">("idle");
  const [result,     setResult]     = useState<SqlResult | null>(null);
  const [errMsg,     setErrMsg]     = useState<string | null>(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [page,       setPage]       = useState(0);
  const [nlOpen,       setNlOpen]       = useState(true);
  const [sqlOpen,      setSqlOpen]      = useState(true);
  const [nlPrompt,     setNlPrompt]     = useState(DEFAULT_NL_PROMPT);
  const [generating,   setGenerating]   = useState(false);
  const [explaining,   setExplaining]   = useState(false);
  const [explanation,  setExplanation]  = useState("");
  const [explainOpen,  setExplainOpen]  = useState(false);

  const runQueryRef     = useRef<() => void>(() => {});
  const abortExplainRef = useRef<AbortController | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0Ref       = useRef(0);

  const color   = TENANT_COLORS[tenant] ?? "#607d8b";
  const display = DISPLAY_NAMES[tenant] ?? tenant;

  const handleGenerate = useCallback(async () => {
    if (!nlPrompt.trim() || generating) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setQuery(DEFAULT_QUERY);
    setGenerating(false);
    setSqlOpen(true);
  }, [nlPrompt, generating]);

  const handleExplain = useCallback(async () => {
    const sql = query.trim();
    if (!sql || explaining) return;

    const key = sessionStorage.getItem(STORAGE_KEY);
    if (!key) {
      setExplanation("No Claude API key found. Open the **KBase Co-Scientist** tab and connect your API key first.");
      setExplainOpen(true);
      return;
    }

    abortExplainRef.current?.abort();
    const controller = new AbortController();
    abortExplainRef.current = controller;

    setExplaining(true);
    setExplanation("");
    setExplainOpen(true);

    try {
      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
      const stream = client.messages.stream(
        {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: "You are a SparkSQL expert embedded in the K-BERDL data lakehouse platform. Explain SQL queries concisely in plain English — what it does, which tables/columns are involved, and what the result represents. No markdown headers, keep it brief.",
          messages: [{ role: "user", content: `Explain this SparkSQL query:\n\n\`\`\`sql\n${sql}\n\`\`\`` }],
        },
        { signal: controller.signal },
      );
      stream.on("text", (text) => setExplanation((prev) => prev + text));
      await stream.finalMessage();
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        setExplanation("Error calling Claude API. Check your API key in the Co-Scientist tab.");
      }
    } finally {
      setExplaining(false);
    }
  }, [query, explaining]);

  const runQuery = useCallback(async () => {
    if (!query.trim() || status === "running") return;
    setStatus("running");
    setResult(null);
    setErrMsg(null);
    setPage(0);
    t0Ref.current = Date.now();
    timerRef.current = setInterval(
      () => setElapsed(Date.now() - t0Ref.current),
      100,
    );
    try {
      const res = await mockExecuteSql();
      setResult(res);
      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrMsg(msg);
      setStatus("error");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [query, tenant, status]);

  // Keep ref current so Monaco's onMount keybinding always has the latest version
  useEffect(() => { runQueryRef.current = runQuery; }, [runQuery]);

  const handleEditorMount: OnMount = useCallback((_editor, monaco) => {
    _editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => runQueryRef.current(),
    );
  }, []);

  const totalPages = result ? Math.ceil(result.rows.length / SQL_PAGE_SIZE) : 0;
  const pageRows   = result?.rows.slice(page * SQL_PAGE_SIZE, (page + 1) * SQL_PAGE_SIZE) ?? [];

  return (
    <div className="sqlc-page">
      {/* ── Top bar ── */}
      <div className="sqlc-bar">
        <button className="dd-back-btn sqlc-back" onClick={onBack}>
          <i className="fa-solid fa-arrow-left" /> Back to Tenants
        </button>

        <div className="sqlc-bar-center">
          <span className="sqlc-tenant-dot" style={{ background: color }} />
          <span className="sqlc-tenant-name">{display}</span>
          <span className="sqlc-sep">·</span>
          <span className="sqlc-label">SQL Console</span>
        </div>

        <div className="sqlc-bar-right">
          {status === "done" && result && (
            <span className="sqlc-stat-pill">
              <i className="fa-solid fa-table-list" />
              {result.rows.length.toLocaleString()} row{result.rows.length !== 1 ? "s" : ""}
              &nbsp;·&nbsp;{result.elapsed_ms.toFixed(0)} ms
            </span>
          )}
        </div>
      </div>

      {/* ── Accordion panes ── */}
      <div className="sqlc-accordion">

        {/* Pane 1 — Natural Language */}
        <div className="sqlc-pane">
          <button
            className="sqlc-pane-hd"
            onClick={() => setNlOpen((o) => !o)}
          >
            <div className="sqlc-pane-hd-left">
              <i className="fa-solid fa-wand-magic-sparkles sqlc-pane-icon sqlc-pane-icon--nl" />
              <span>Natural Language</span>
            </div>
            <i className={`fa-solid ${nlOpen ? "fa-chevron-up" : "fa-chevron-down"} sqlc-pane-chevron`} />
          </button>

          {nlOpen && (
            <div className="sqlc-pane-body">
              <textarea
                className="sqlc-nl-area"
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                rows={3}
                placeholder="Describe what you want to query…"
              />
              <div className="sqlc-gen-row">
                <button
                  className="sqlc-gen-btn"
                  onClick={handleGenerate}
                  disabled={generating || !nlPrompt.trim()}
                >
                  {generating ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      Generating SQL…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-wand-magic-sparkles" />
                      Generate SQL
                    </>
                  )}
                </button>
                <span className="sqlc-kbd-hint">Translates your intent into a SparkSQL query</span>
              </div>
            </div>
          )}
        </div>

        {/* Pane 2 — SQL Editor */}
        <div className="sqlc-pane">
          <button
            className="sqlc-pane-hd"
            onClick={() => setSqlOpen((o) => !o)}
          >
            <div className="sqlc-pane-hd-left">
              <i className="fa-solid fa-code sqlc-pane-icon sqlc-pane-icon--sql" />
              <span>SQL Editor</span>
            </div>
            <i className={`fa-solid ${sqlOpen ? "fa-chevron-up" : "fa-chevron-down"} sqlc-pane-chevron`} />
          </button>

          {sqlOpen && (
            <div className="sqlc-pane-body sqlc-pane-body--editor">
              <MonacoEditor
                height="400px"
                language="sql"
                theme="vs"
                value={query}
                onChange={(v) => setQuery(v ?? "")}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  padding: { top: 8, bottom: 8 },
                  renderLineHighlight: "gutter",
                }}
              />
              <div className="sqlc-run-row">
                <button
                  className="sqlc-run-btn"
                  onClick={() => runQueryRef.current()}
                  disabled={status === "running"}
                >
                  {status === "running" ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      Running… {(elapsed / 1000).toFixed(1)} s
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-play" />
                      Run Query
                    </>
                  )}
                </button>
                <span className="sqlc-kbd-hint">Ctrl+Enter</span>
                <button
                  className="sqlc-explain-btn"
                  onClick={handleExplain}
                  disabled={explaining || !query.trim()}
                  title="Explain this query with Claude AI"
                >
                  {explaining ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      Explaining…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-lightbulb" />
                      Explain
                    </>
                  )}
                </button>
              </div>

              {explainOpen && explanation && (
                <div className="sqlc-explain-panel">
                  <div className="sqlc-explain-hd">
                    <i className="fa-solid fa-lightbulb" style={{ color: "#f59e0b" }} />
                    <span>Query Explanation</span>
                    <button
                      className="sqlc-explain-close"
                      onClick={() => { setExplainOpen(false); abortExplainRef.current?.abort(); }}
                      title="Close"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                  <pre className="sqlc-explain-body">{explanation}</pre>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Results area ── */}
      <div className="sqlc-results">
        {status === "error" && (
          <div className="sqlc-error-box">
            <i className="fa-solid fa-circle-exclamation" />
            <pre className="sqlc-error-pre">{errMsg}</pre>
          </div>
        )}

        {status === "done" && result && result.columns.length === 0 && (
          <div className="sqlc-empty-result">
            <i className="fa-solid fa-circle-check" style={{ color: "#16a34a" }} />
            <span>Query completed — no rows returned.</span>
          </div>
        )}

        {status === "done" && result && result.columns.length > 0 && (
          <>
            <div className="sqlc-table-wrap">
              <table className="sqlc-result-table">
                <thead>
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "sqlc-row-even" : ""}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="sqlc-result-cell">
                          {cell === null ? (
                            <span className="dd-null">null</span>
                          ) : (
                            cell
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="sqlc-pagination">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  ‹ Prev
                </button>
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                >
                  Next ›
                </button>
              </div>
            )}
          </>
        )}

        {status === "idle" && (
          <div className="sqlc-idle">
            <i className="fa-solid fa-terminal" />
            <span>Write a SparkSQL query above and click <strong>Run Query</strong> or press <kbd>Ctrl+Enter</kbd></span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Chat types ──────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─────────────────────────── CoScientistChat ─────────────────────────

const MOCK_RESPONSES: { match: RegExp; text: string }[] = [
  {
    match: /enigma|chromium|chrom|metal.*(toler|resist)|tolera.*metal/i,
    text: "Based on ENIGMA's metal tolerance data, top Cr(VI)-tolerant isolates include:\n\n• Arthrobacter sp. SRS-W-2-2016 — MIC > 5 mM Cr(VI), driven by ChrA efflux transporters\n• Caulobacter sp. OR37 — upregulates glutathione-S-transferase under Cr(VI) stress\n• Deinococcus radiodurans — dual metal and radiation resistance via Mn-rich proteome\n\nTo query this directly:\n\nSELECT genome_id, species, cr_mic_mm\nFROM enigma.metal_tolerance\nWHERE metal = 'Cr'\nORDER BY cr_mic_mm DESC\nLIMIT 10;",
  },
  {
    match: /adp1|pangenome|acinetobacter|core gene|pan.?genome/i,
    text: "The Acinetobacter baylyi ADP1 pangenome spans ~3,200 gene clusters:\n\n• Core (≥99% presence): 2,847 genes — DNA replication, ribosomal proteins, central carbon metabolism\n• Accessory (15–99%): 1,230 genes — niche adaptation, mobile genetic elements, catabolic pathways\n• Singletons: 420 genes — strain-specific, largely hypothetical proteins\n\nNotably, 83 aromatic catabolism genes (catABC, benABCD, pcaGH) appear in the core set — reflecting ADP1's remarkable xenobiotic degradation capacity across all sampled strains.",
  },
  {
    match: /nmdc|metagenom|microbiom/i,
    text: "The NMDC tenant contains 1,247 metagenome assemblies spanning 12 biomes — grassland, forest, wetland, and contaminated sediment environments.\n\nKey datasets:\n• Soil metagenomes: 634 samples (GOLD study IDs Gs0110115, Gs0114663)\n• Sediment metagenomes: 312 samples from contaminated DOE sites\n• Aquatic metagenomes: 301 samples including ALOHA and freshwater systems\n\nExplore functional profiles:\n\nSELECT biome, COUNT(*) AS samples, AVG(contig_count) AS avg_contigs\nFROM nmdc.metagenome_assembly\nGROUP BY biome\nORDER BY samples DESC;",
  },
  {
    match: /kbase|protein|annotation|kegg|pfam|go.?term|function/i,
    text: "KBase provides functional annotation through several integrated databases:\n\n• KEGG Orthology (KO): 23,847 annotated proteins across KBase tenant genomes\n• Pfam domains: 18,204 unique domain families detected\n• GO terms: Biological Process, Molecular Function, and Cellular Component ontologies\n• COG categories: 25 functional categories covering metabolism, information storage, and cellular processes\n\nTo find all genomes with a specific KEGG function:\n\nSELECT genome_id, species, ko_id, ko_description\nFROM kbase.functional_annotations\nWHERE ko_id = 'K00370'\nORDER BY species;",
  },
  {
    match: /sql|query|select|table|from|where/i,
    text: "I can help you build SparkSQL queries against any K-BERDL tenant. Here's a template for cross-genome functional analysis:\n\nSELECT\n  m.tenant_id,\n  m.species,\n  m.genome_size_mb,\n  f.ko_count\nFROM kbase.genome_metadata m\nJOIN kbase.functional_summary f\n  ON m.genome_id = f.genome_id\nWHERE m.completeness > 90\n  AND m.contamination < 5\nORDER BY f.ko_count DESC\nLIMIT 20;\n\nWhat specific data are you trying to query? I can tailor this to your exact needs.",
  },
];

const MOCK_FALLBACK = "I can help you analyze biological data across K-BERDL tenants including ENIGMA, NMDC, PlanetMicrobe, KBase, and more.\n\nSome things I can help with:\n• Querying the SparkSQL lakehouse for specific organisms, genes, or functions\n• Interpreting metagenome assembly statistics and functional profiles\n• Comparing pangenome core/accessory gene partitions across taxa\n• Identifying genomes with specific metabolic capabilities or environmental tolerances\n\nWhat would you like to explore?";

function getMockResponse(input: string): string {
  for (const { match, text } of MOCK_RESPONSES) {
    if (match.test(input)) return text;
  }
  return MOCK_FALLBACK;
}

// ─────────────────────────── MockChatDemo ────────────────────────────

type DemoPhase = "user-typing" | "thinking" | "ai-streaming" | "pausing";

const DEMO_EXCHANGES = [
  {
    user: "Which ENIGMA genomes show the highest chromium tolerance?",
    assistant: "Based on ENIGMA's metal tolerance data, top Cr(VI)-tolerant isolates include:\n\n• Arthrobacter sp. SRS-W-2-2016 — MIC > 5 mM Cr(VI), ChrA efflux transporter\n• Caulobacter sp. OR37 — upregulates glutathione-S-transferase under Cr(VI) stress\n• Deinococcus radiodurans — dual metal/radiation resistance via Mn-rich proteome\n\nQuery the data:\n\nSELECT genome_id, species, cr_mic_mm\nFROM enigma.metal_tolerance\nWHERE metal = 'Cr'\nORDER BY cr_mic_mm DESC LIMIT 10;",
  },
  {
    user: "Summarize the core gene families in the ADP1 pangenome.",
    assistant: "The ADP1 pangenome spans ~3,200 gene clusters:\n\n• Core (≥99% presence): 2,847 genes — replication, ribosomal proteins, central metabolism\n• Accessory (15–99%): 1,230 genes — niche adaptation, mobile elements, catabolism\n• Singletons: 420 genes — strain-specific, mostly hypothetical\n\nNotably, 83 aromatic catabolism genes (catABC, benABCD, pcaGH) appear in the core set — reflecting ADP1's broad xenobiotic degradation capacity.",
  },
];

function MockChatDemo() {
  const [exIdx,     setExIdx]     = useState(0);
  const [userChars, setUserChars] = useState(0);
  const [aiChars,   setAiChars]   = useState(0);
  const [phase,     setPhase]     = useState<DemoPhase>("user-typing");

  const ex = DEMO_EXCHANGES[exIdx];

  useEffect(() => {
    if (phase !== "user-typing") return;
    if (userChars >= ex.user.length) {
      const t = setTimeout(() => setPhase("thinking"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setUserChars((c) => c + 1), 28);
    return () => clearTimeout(t);
  }, [phase, userChars, ex.user.length]);

  useEffect(() => {
    if (phase !== "thinking") return;
    const t = setTimeout(() => setPhase("ai-streaming"), 900);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ai-streaming") return;
    if (aiChars >= ex.assistant.length) {
      const t = setTimeout(() => setPhase("pausing"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAiChars((c) => c + 1), 9);
    return () => clearTimeout(t);
  }, [phase, aiChars, ex.assistant.length]);

  useEffect(() => {
    if (phase !== "pausing") return;
    const t = setTimeout(() => {
      setExIdx((i) => (i + 1) % DEMO_EXCHANGES.length);
      setUserChars(0);
      setAiChars(0);
      setPhase("user-typing");
    }, 3500);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="demo-chat">
      {userChars > 0 && (
        <div className="chat-msg chat-msg--user">
          <div className="chat-bubble">
            {ex.user.slice(0, userChars)}
            {phase === "user-typing" && <span className="chat-cursor" />}
          </div>
        </div>
      )}
      {(phase === "thinking" || aiChars > 0) && (
        <div className="chat-msg chat-msg--assistant">
          <div className="chat-avatar">
            <img src={`${import.meta.env.BASE_URL}kberdl-logo.png`} alt="" className="chat-avatar-img" />
          </div>
          {phase === "thinking" ? (
            <div className="chat-bubble chat-bubble--thinking">
              <span /><span /><span />
            </div>
          ) : (
            <div className="chat-bubble">
              <pre className="demo-ai-pre">
                {ex.assistant.slice(0, aiChars)}
                {phase === "ai-streaming" && <span className="chat-cursor" />}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CoScientistChat() {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
  };

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: userText }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    // Thinking delay before streaming
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

    const response = getMockResponse(userText);
    for (let i = 0; i < response.length; i++) {
      await new Promise((r) => setTimeout(r, 10));
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: response.slice(0, i + 1) } : m)
      );
    }

    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const inputBox = (
    <div className="chat-input-box">
      <textarea
        ref={textareaRef}
        className="chat-textarea"
        placeholder="Message KBase Co-Scientist…"
        value={input}
        rows={3}
        onChange={(e) => { setInput(e.target.value); autoResize(); }}
        onKeyDown={handleKeyDown}
        disabled={streaming}
      />
      <button
        className="chat-send-btn"
        onClick={handleSend}
        disabled={!input.trim() || streaming}
        title="Send (Enter)"
      >
        <i className="fa-solid fa-arrow-up" />
      </button>
    </div>
  );

  return (
    <div className="chat-page">
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <img src={`${import.meta.env.BASE_URL}kberdl-logo.png`} alt="KBase Co-Scientist" className="chat-logo-img" />
            <h2>KBase Co-Scientist</h2>
            <p>Your AI assistant for biological data analysis and scientific discovery.</p>
            <MockChatDemo />
            <div className="chat-input-wrap chat-input-wrap--inline">
              {inputBox}
              <p className="chat-disclaimer">
                KBase Co-Scientist may make errors. Always verify scientific results independently.
              </p>
            </div>
          </div>
        ) : (
          <div className="chat-thread">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="chat-avatar">
                    <img src={`${import.meta.env.BASE_URL}kberdl-logo.png`} alt="" className="chat-avatar-img" />
                  </div>
                )}
                <div className="chat-bubble">
                  {msg.content}
                  {streaming && msg.role === "assistant" && msg === messages[messages.length - 1] && (
                    <span className="chat-cursor" />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="chat-input-wrap">
          {inputBox}
          <p className="chat-disclaimer">
            KBase Co-Scientist may make errors. Always verify scientific results independently.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── ObservatoryTab ──────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "ENVIRONMENTAL GENOMICS": { bg: "#ccfbf1", color: "#0f766e" },
  "FUNCTIONAL ANALYSIS":    { bg: "#dbeafe", color: "#1d4ed8" },
  "COMPARATIVE GENOMICS":   { bg: "#ede9fe", color: "#6d28d9" },
  "GENOMIC DIVERSITY":      { bg: "#dcfce7", color: "#15803d" },
  "METABOLIC ANALYSIS":     { bg: "#ffedd5", color: "#c2410c" },
};

interface DiscoveryItem {
  id: string;
  category: string;
  date?: string;
  title: string;
  findings?: string[];
  noFindings?: boolean;
  hypothesis?: string;
}

const BERIL_DISCOVERIES: DiscoveryItem[] = [
  {
    id: "env-phylo",
    category: "ENVIRONMENTAL GENOMICS",
    date: "January 2024",
    title: "Environment vs Phylogeny: Phylogeny usually dominates",
    findings: [
      "Analysis of 515 genomes (OSCAR panel) reveals novel environmental dimensions",
      "Phylogeny dominates in 209/515 species (40.6%)",
      "Environmental correlates: only 5 of 24 species are statistically associated with meaningful taxa (~200)",
      "Evolutionary associations suggest a phylogenetic effect is maintained even in functionally associated genes (~200)",
    ],
  },
  {
    id: "ail-baseline",
    category: "FUNCTIONAL ANALYSIS",
    date: "January 2024",
    title: "AIL correlation requires per-species baseline",
    findings: [
      "Attempting to compare across 24 species simultaneously masks per-species variation",
      "Per-species baseline analysis is required to reveal significant patterns",
    ],
  },
  {
    id: "pangenome-axes",
    category: "COMPARATIVE GENOMICS",
    date: "January 2024",
    title: "Pangenome-wide axes are pre-computed",
    findings: [
      "Pre-computed axes available via PANGENOME_RESOLUTION and PANGENE_MATRIX tables",
      "Direct SQL access enables efficient cross-species pangenome comparisons",
    ],
  },
  {
    id: "no-correlation",
    category: "ENVIRONMENTAL GENOMICS",
    title: "No correlation between genomics and env/phyla effects",
    noFindings: true,
  },
  {
    id: "symbiotic-pangenomes",
    category: "GENOMIC DIVERSITY",
    title: "12-splitter pangenomes are symbiotic",
    findings: [
      "12 pangenome-related patterns identified across human-associated species",
      "Human-associated pangenomes show elevated gene counts in hostile environments",
      "Various standardized images may contain ~50–75% confidence intervals",
      "There are more N>2 pangenome-distinct gene families than expected",
    ],
  },
  {
    id: "universal-functional",
    category: "FUNCTIONAL ANALYSIS",
    date: "January 2024",
    title: "Universal functional partitioning in bacterial pangenomes",
    findings: [
      "Core genes consistently enriched in energy metabolism and essential cellular functions",
      "Accessory genes enriched in environment-specific adaptations",
      "3.5 Gitonome enrichment: ~0.86% consistency, ~0.86% consistency",
      "Pattern holds across all 25 species analyzed",
    ],
    hypothesis: "This aligns with the proposed principle of universal pangenome functional partitioning across 25 species",
  },
  {
    id: "noncognate",
    category: "COMPARATIVE GENOMICS",
    title: "Noncognate genes consistently enriched in accessory genome",
    findings: [
      "Noncognate genes are disproportionately represented in the accessory genome",
      "Pattern is consistent across all analyzed bacterial species",
    ],
  },
  {
    id: "cog-meaningful",
    category: "COMPARATIVE GENOMICS",
    date: "January 2024",
    title: "Complete COG categories are biologically meaningful",
    findings: [
      "Category 14 (mobile-defense): ~0.85% consistency across species",
      "Suggests functional modules within the 'mobile defense' category",
      "Should not be filtered out as noise — may represent genuine multi-functional genes",
    ],
  },
  {
    id: "aopi-regulatory",
    category: "METABOLIC ANALYSIS",
    date: "February 2024",
    title: "AOPI uses qualitatively different regulatory configurations per culture curve",
    findings: [
      "Each culture curve phase exhibits a distinct regulatory configuration",
      "Differences are qualitative (structural), not merely quantitative",
      "Findings suggest phase-aware regulatory modelling is required for accurate predictions",
    ],
  },
];

function DiscoveryCard({ item }: { item: DiscoveryItem }) {
  const colors = CATEGORY_COLORS[item.category] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <div className="obs-card">
      <div className="obs-card-top">
        <span className="obs-category" style={{ background: colors.bg, color: colors.color }}>
          {item.category}
        </span>
        {item.date && <span className="obs-date">{item.date}</span>}
      </div>
      <h3 className="obs-title">{item.title}</h3>
      {item.noFindings ? (
        <p className="obs-no-findings">No significant relationships found.</p>
      ) : (
        item.findings && (
          <ul className="obs-findings">
            {item.findings.map((f, i) => <li key={i} className="obs-finding">{f}</li>)}
          </ul>
        )
      )}
      {item.hypothesis && (
        <div className="obs-hypothesis">
          <strong>Hypothesis validation:</strong> {item.hypothesis}
        </div>
      )}
    </div>
  );
}

function ObservatoryTab() {
  return (
    <div className="obs-page">
      <div className="obs-header">
        <span className="obs-powered">Powered by BERIL</span>
        <h2 className="obs-heading">KBase Research Observatory</h2>
        <p className="obs-sub">A timeline of research findings and insights discovered during analysis of K-BERDL tenant databases</p>
      </div>
      <div className="obs-list">
        {BERIL_DISCOVERIES.map((item) => <DiscoveryCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}

// ─────────────────────────── Knowledge Amplification Feed ──────────────────

type FeedEventType = "ingest" | "annotation" | "discovery" | "schema" | "milestone" | "alert";

interface FeedItem {
  id: string;
  type: FeedEventType;
  tenant?: string;
  tenantLabel?: string;
  title: string;
  detail: string;
  ago: string;
  tags?: string[];
}

const FEED_TYPE_META: Record<FeedEventType, { icon: string; color: string; label: string }> = {
  ingest:      { icon: "fa-solid fa-upload",                color: "#3b82f6", label: "Data Load"       },
  annotation:  { icon: "fa-solid fa-tag",                   color: "#10b981", label: "Annotation"      },
  discovery:   { icon: "fa-solid fa-lightbulb",             color: "#f59e0b", label: "Discovery"       },
  schema:      { icon: "fa-solid fa-table",                 color: "#8b5cf6", label: "Schema Update"   },
  milestone:   { icon: "fa-solid fa-trophy",                color: "#f97316", label: "Milestone"       },
  alert:       { icon: "fa-solid fa-triangle-exclamation",  color: "#ef4444", label: "Alert"           },
};

const FEED_ITEMS: FeedItem[] = [
  {
    id: "f01", type: "ingest", tenant: "enigma", tenantLabel: "ENIGMA",
    title: "14,200 protein sequences ingested",
    detail: "Batch ingest of sulfate-reducing bacterial proteomes from DOE JGI IMG/M completed. Tables `protein`, `feature`, and `kegg_pathway` updated.",
    ago: "2 hours ago", tags: ["proteins", "JGI", "batch"],
  },
  {
    id: "f02", type: "annotation", tenant: "nmdc", tenantLabel: "NMDC",
    title: "GO term annotations refreshed for 8,300 features",
    detail: "Gene Ontology terms updated using QuickGO 2025-Q4 release. Evidence codes upgraded from IEA to ISS for 1,240 high-confidence assignments.",
    ago: "3 hours ago", tags: ["GO", "QuickGO"],
  },
  {
    id: "f03", type: "discovery", tenantLabel: "KBase Co-Scientist",
    title: "Sulfate-reduction pathway correlation identified across 47 Desulfovibrio genomes",
    detail: "Co-Scientist cross-referenced ENIGMA sulfate reduction data with NMDC isolate genomes and found a conserved 11-gene operon (dsrAB cluster) present in 94% of samples — suggesting a shared horizontal gene transfer event.",
    ago: "5 hours ago", tags: ["HGT", "dsrAB", "ENIGMA", "NMDC"],
  },
  {
    id: "f04", type: "ingest", tenant: "planetmicrobe", tenantLabel: "PlanetMicrobe",
    title: "780 ocean metagenomic samples loaded from TARA Oceans",
    detail: "Paired-end sequencing reads processed through ATLAS 2.4 pipeline. Assembled contigs and predicted ORFs loaded into `sample`, `genome`, and `feature` tables.",
    ago: "8 hours ago", tags: ["metagenomics", "TARA", "ocean"],
  },
  {
    id: "f05", type: "schema", tenant: "enigma", tenantLabel: "ENIGMA",
    title: "New table `sulfate_reduction_genes` added (12 columns)",
    detail: "Schema extension to support the H₂S/sulfate reduction study. Includes columns for gene cluster ID, dsr subunit type, operon position, and predicted redox potential.",
    ago: "12 hours ago", tags: ["DDL", "sulfate"],
  },
  {
    id: "f06", type: "milestone", tenantLabel: "K-BERDL Platform",
    title: "10 TB of scientific data now managed across all tenants",
    detail: "Combined storage across 16 active tenants crossed the 10 TB threshold. KBase (3.2 TB), NMDC (2.3 TB), and PhageFoundry (1.8 TB) are the top three contributors.",
    ago: "1 day ago", tags: ["storage", "platform"],
  },
  {
    id: "f07", type: "annotation", tenant: "microbdiscoveryforge", tenantLabel: "MicrobDiscoveryForge",
    title: "KEGG pathway completeness recalculated for 3,100 genomes",
    detail: "Using HMM profiles from KEGG release 109.0. Average pathway completeness increased from 61% to 68% after re-annotation with updated KOfam models.",
    ago: "1 day ago", tags: ["KEGG", "HMM", "KOfam"],
  },
  {
    id: "f08", type: "ingest", tenant: "phagefoundry", tenantLabel: "PhageFoundry",
    title: "2,400 phage protein clusters loaded from PHROGs database",
    detail: "PHROGs v4 (Phage pROteins with HIerarchical Groups) integrated. Functional annotations now available for tail fiber, baseplate, and lysins across all phage genomes.",
    ago: "1 day ago", tags: ["PHROGs", "phage", "proteins"],
  },
  {
    id: "f09", type: "discovery", tenantLabel: "KBase Co-Scientist",
    title: "Novel host-range determinant detected in PhageFoundry tail fiber proteins",
    detail: "Structural similarity search against AlphaFold DB identified a 140-residue receptor-binding domain in 38 phages not previously catalogued. Predicted to bind LPS O-antigen variants in Pseudomonas aeruginosa.",
    ago: "1 day ago", tags: ["AlphaFold", "PhageFoundry", "RBD"],
  },
  {
    id: "f10", type: "ingest", tenant: "nmdc", tenantLabel: "NMDC",
    title: "Soil metagenome data from 120 NEON terrestrial sites ingested",
    detail: "Paired metagenome and metatranscriptome data from NEON Phase-II sampling campaign. 14.6 billion paired reads processed; 890,000 predicted proteins loaded.",
    ago: "2 days ago", tags: ["NEON", "soil", "metatranscriptome"],
  },
  {
    id: "f11", type: "schema", tenant: "ideas", tenantLabel: "IDEAS",
    title: "Schema extended: `metabolite` table gains 3 HMDB columns",
    detail: "Added `hmdb_id`, `hmdb_class`, and `hmdb_sub_class` to the metabolite table to align with Human Metabolome Database v5.0. 22,000 existing rows back-filled.",
    ago: "2 days ago", tags: ["HMDB", "metabolomics", "DDL"],
  },
  {
    id: "f12", type: "discovery", tenantLabel: "KBase Co-Scientist",
    title: "Cross-tenant core genome overlap: ENIGMA and NMDC sulfate reducers share 89%",
    detail: "Pangenome analysis spanning 180 genomes from two independent DOE projects reveals unexpectedly high core genome conservation — challenging the assumption of habitat-specific divergence in sulfate-reducing bacteria.",
    ago: "2 days ago", tags: ["pangenome", "ENIGMA", "NMDC", "cross-tenant"],
  },
  {
    id: "f13", type: "annotation", tenant: "aile", tenantLabel: "AIAle",
    title: "5,200 CDS features re-annotated using updated NCBI RefSeq models",
    detail: "Prokka v1.14.6 re-run with RefSeq 2025-01 protein database. 840 previously hypothetical proteins now have functional assignments; 12 genes reclassified as pseudogenes.",
    ago: "3 days ago", tags: ["Prokka", "RefSeq", "CDS"],
  },
  {
    id: "f14", type: "ingest", tenant: "pnnlsoil", tenantLabel: "PnnlSoil",
    title: "450 soil core samples with 16S rRNA amplicon data loaded",
    detail: "QIIME2 2024.5 amplicon pipeline outputs ingested. OTU table, taxonomy assignments, and alpha/beta diversity metrics available in `sample` and `taxonomy` tables.",
    ago: "3 days ago", tags: ["16S", "QIIME2", "amplicon"],
  },
  {
    id: "f15", type: "alert", tenant: "enigma", tenantLabel: "ENIGMA",
    title: "Duplicate sample IDs detected in `biosample` — 12 records flagged",
    detail: "Data quality check identified 12 biosample entries with conflicting metadata originating from two independent field campaigns. Records quarantined pending curator review.",
    ago: "3 days ago", tags: ["data-quality", "quarantine"],
  },
  {
    id: "f16", type: "milestone", tenant: "kbase", tenantLabel: "KBase",
    title: "620 tables across 18 databases fully indexed for Trino query",
    detail: "Iceberg metadata synchronisation complete. All tables now queryable from the Trino SQL console with partition pruning and column-level statistics available.",
    ago: "4 days ago", tags: ["Trino", "Iceberg", "indexing"],
  },
  {
    id: "f17", type: "discovery", tenant: "planetmicrobe", tenantLabel: "PlanetMicrobe",
    title: "34 novel MAGs linked to sulfur cycle enzymes absent from reference DBs",
    detail: "Co-Scientist screened 5,000+ MAGs assembled from TARA ocean samples using custom HMM profiles. The 34 high-quality bins represent potentially undescribed lineages in the Gammaproteobacteria.",
    ago: "4 days ago", tags: ["MAGs", "sulfur-cycle", "novel"],
  },
  {
    id: "f18", type: "ingest", tenant: "globalusers", tenantLabel: "GlobalUsers",
    title: "User-submitted genome batch (340 genomes) processed and loaded",
    detail: "Community submission from the KBase public workspace pipeline. Genomes passed CheckM2 quality thresholds (completeness >90%, contamination <5%) and are now available for cross-tenant queries.",
    ago: "5 days ago", tags: ["community", "CheckM2", "batch"],
  },
  {
    id: "f19", type: "annotation", tenant: "kessence", tenantLabel: "KeScience",
    title: "Protein domain hits updated with Pfam 35.0 — 18,000 features affected",
    detail: "InterProScan 5.65 re-run against Pfam 35.0 (19,632 families). 18,000 features gained new or updated domain annotations; 2,100 features lost obsolete Pfam-A entries.",
    ago: "5 days ago", tags: ["Pfam", "InterProScan", "domains"],
  },
  {
    id: "f20", type: "schema", tenant: "asymbio", tenantLabel: "Asymbio",
    title: "New database `synthetic_circuits` created with 8 tables",
    detail: "Schema provisioned for synthetic biology circuit data: `part`, `device`, `assembly`, `characterisation`, `model`, `experiment`, `strain`, and `measurement`.",
    ago: "6 days ago", tags: ["synthetic-bio", "DDL", "new-db"],
  },
  {
    id: "f21", type: "ingest", tenant: "bravebread", tenantLabel: "BraveBread",
    title: "Fermentation metabolomics data (900 samples) ingested from LC-MS pipeline",
    detail: "Untargeted LC-MS/MS data from time-series fermentation experiments processed through MZmine 3. 4,200 features detected; 890 annotated against HMDB and KEGG compound databases.",
    ago: "6 days ago", tags: ["LC-MS", "metabolomics", "MZmine"],
  },
  {
    id: "f22", type: "alert", tenant: "usgis", tenantLabel: "USGIS",
    title: "Query timeout anomaly in `soil_carbon` table — index rebuild scheduled",
    detail: "Automated query monitor detected p95 latency spike from 340 ms to 12.4 s over a 6-hour window. Root cause identified as stale Iceberg table statistics. Rebuild job queued for off-peak window.",
    ago: "7 days ago", tags: ["performance", "Iceberg", "maintenance"],
  },
  {
    id: "f23", type: "discovery", tenantLabel: "KBase Co-Scientist",
    title: "Predicted antibiotic resistance gene transfer hotspot in 12 KBase draft genomes",
    detail: "Genomic island analysis (IslandPath-DIMOB) combined with ARG annotation (CARD 3.2) identified a 42 kb mobile element carrying 7 AMR genes flanked by IS3-family transposons in 12 closely related draft assemblies.",
    ago: "7 days ago", tags: ["AMR", "CARD", "mobile-elements", "KBase"],
  },
];

const FEED_FILTER_OPTIONS: { id: FeedEventType | "all"; label: string }[] = [
  { id: "all",        label: "All Events"     },
  { id: "ingest",     label: "Data Loads"     },
  { id: "annotation", label: "Annotations"    },
  { id: "discovery",  label: "Discoveries"    },
  { id: "schema",     label: "Schema Updates" },
  { id: "milestone",  label: "Milestones"     },
  { id: "alert",      label: "Alerts"         },
];

function DataIntelligenceFeed() {
  const [filter, setFilter] = useState<FeedEventType | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const visible = filter === "all" ? FEED_ITEMS : FEED_ITEMS.filter((f) => f.type === filter);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const countFor = (id: FeedEventType | "all") =>
    id === "all" ? FEED_ITEMS.length : FEED_ITEMS.filter((f) => f.type === id).length;

  return (
    <div className="dif-page">
      {/* Header */}
      <div className="dif-header">
        <div className="dif-header-left">
          <h2 className="dif-title">Knowledge Amplification Feed</h2>
          <p className="dif-sub">Live activity across all K-BERDL lakehouse tenants</p>
        </div>
        <div className="dif-live">
          <span className="dif-live-dot" />
          Live
        </div>
      </div>

      {/* Filter bar */}
      <div className="dif-filters">
        {FEED_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className={`dif-filter-btn${filter === opt.id ? " dif-filter-btn--active" : ""}${opt.id !== "all" ? ` dif-filter-btn--${opt.id}` : ""}`}
            onClick={() => setFilter(opt.id)}
          >
            {opt.id !== "all" && <i className={`${FEED_TYPE_META[opt.id as FeedEventType].icon} dif-filter-icon`} />}
            {opt.label}
            <span className="dif-filter-count">{countFor(opt.id)}</span>
          </button>
        ))}
      </div>

      {/* Feed list */}
      <div className="dif-list">
        {visible.map((item, idx) => {
          const meta    = FEED_TYPE_META[item.type];
          const isExp   = expanded.has(item.id);
          const tenantColor = item.tenant ? (TENANT_COLORS[item.tenant] ?? "#607d8b") : "#6b7280";

          return (
            <div key={item.id} className={`dif-item${isExp ? " dif-item--expanded" : ""}`}>
              {/* Timeline connector */}
              <div className="dif-timeline">
                <div className="dif-icon-wrap" style={{ background: meta.color + "1a", border: `2px solid ${meta.color}` }}>
                  <i className={`${meta.icon} dif-icon`} style={{ color: meta.color }} />
                </div>
                {idx < visible.length - 1 && <div className="dif-connector" />}
              </div>

              {/* Content */}
              <div className="dif-content">
                <div className="dif-content-top">
                  <div className="dif-meta-row">
                    <span className="dif-type-badge" style={{ background: meta.color + "18", color: meta.color }}>
                      {meta.label}
                    </span>
                    {item.tenant && (
                      <span className="dif-tenant-badge" style={{ background: tenantColor + "18", color: tenantColor }}>
                        <span className="dif-tenant-dot" style={{ background: tenantColor }} />
                        {item.tenantLabel}
                      </span>
                    )}
                    {!item.tenant && item.tenantLabel && (
                      <span className="dif-tenant-badge dif-tenant-badge--platform">
                        <i className="fa-solid fa-microchip dif-tenant-dot-icon" />
                        {item.tenantLabel}
                      </span>
                    )}
                    <span className="dif-ago">
                      <i className="fa-regular fa-clock" /> {item.ago}
                    </span>
                  </div>

                  <p className="dif-item-title">{item.title}</p>

                  <p className={`dif-item-detail${isExp ? "" : " dif-item-detail--clamp"}`}>
                    {item.detail}
                  </p>

                  <div className="dif-item-footer">
                    {item.tags && (
                      <div className="dif-tags">
                        {item.tags.map((tag) => (
                          <span key={tag} className="dif-tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <button className="dif-expand-btn" onClick={() => toggleExpand(item.id)}>
                      {isExp ? "Show less" : "Show more"}
                      <i className={`fa-solid fa-chevron-${isExp ? "up" : "down"}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="dif-empty">
            <i className="fa-solid fa-inbox" />
            <p>No events match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── WorkspacePage ───────────────────────────

export default function WorkspacePage() {
  const [tenants, setTenants]               = useState<string[]>([]);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState("tenants");
  const [activeDictionary, setActiveDictionary] = useState<string | null>(null);
  const [activeConsole,    setActiveConsole]    = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Sync tab / dictionary / console view from URL search params (sidebar links)
  useEffect(() => {
    const tab     = searchParams.get("tab");
    const dict    = searchParams.get("dictionary");
    const console_ = searchParams.get("console");
    if (dict) {
      setActiveTab("tenants");
      setActiveDictionary(dict);
      setActiveConsole(null);
    } else if (console_) {
      setActiveTab("tenants");
      setActiveConsole(console_);
      setActiveDictionary(null);
    } else if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
      setActiveDictionary(null);
      setActiveConsole(null);
    }
  }, [searchParams]);

  useEffect(() => {
    getTenants()
      .then(setTenants)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading workspace…</div>;

  return (
    <div className="workspace-page">
      {/* Tab bar */}
      <div className="ws-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`ws-tab ${activeTab === tab.id ? "ws-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "tenants" && activeDictionary && (
        <DataDictionaryView
          tenant={activeDictionary}
          onBack={() => setActiveDictionary(null)}
        />
      )}

      {activeTab === "tenants" && !activeDictionary && activeConsole && (
        <SQLConsoleView
          tenant={activeConsole}
          onBack={() => setActiveConsole(null)}
        />
      )}

      {activeTab === "tenants" && !activeDictionary && !activeConsole && (
        <>
          <div className="workspace-header">
            <p className="workspace-sub">
              {tenants.length} tenant{tenants.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <div className="tenant-grid">
            {tenants.map((t) => (
              <TenantCard
                key={t}
                tenant={t}
                onViewDictionary={() => setActiveDictionary(t)}
                onOpenConsole={() => setActiveConsole(t)}
              />
            ))}
          </div>
        </>
      )}

      {activeTab === "coscience" && <CoScientistChat />}

      {activeTab === "mdf" && <ObservatoryTab />}

      {activeTab === "feed" && <DataIntelligenceFeed />}
    </div>
  );
}
