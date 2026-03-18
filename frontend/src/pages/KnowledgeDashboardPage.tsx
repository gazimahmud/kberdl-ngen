import { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────

interface KeyFinding {
  title: string;
  detail: string;
}

interface Notebook {
  step: string;
  name: string;
  purpose: string;
}

interface ProjectData {
  id: string;
  title: string;
  subtitle?: string;
  status: "complete" | "in_progress";
  category: string;
  categoryColor: string;
  author: string;
  year: number;
  tags: string[];
  researchQuestion: string;
  overview: string;
  keyFindings: KeyFinding[];
  tenants: string[];
  tenantTables: Record<string, string[]>;
  notebooks: Notebook[];
  figures: string[];
}

// ── Tenant display helpers ────────────────────────────────────────────

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

// ── Project data ──────────────────────────────────────────────────────

const PROJECTS: ProjectData[] = [
  {
    id: "acinetobacter_adp1_explorer",
    title: "ADP1 Data Explorer",
    subtitle: "Acinetobacter baylyi ADP1",
    status: "complete", category: "Multi-Omics", categoryColor: "#127dc3",
    author: "Paramvir Dehal · LBNL", year: 2026,
    tags: ["multi-omics", "pangenomics", "metabolic modeling", "proteomics"],
    researchQuestion: "What is the scope and structure of a comprehensive ADP1 database, and how do its annotations, metabolic models, and phenotype data intersect with BERDL collections (pangenome, biochemistry, fitness, PhageFoundry)?",
    overview: "Explores a user-provided SQLite database (136 MB) containing comprehensive data for A. baylyi ADP1 and related genomes — 15 tables spanning 5,852 genes with 51 annotation columns, metabolic model reactions (17,984), gene-phenotype associations (239K), essentiality classifications, proteomics, mutant growth data, and a 14-genome pangenome. The goal is to characterize database scope, identify BERDL connection points, and demonstrate the user_data/ convention for bringing external data into observatory projects.",
    keyFindings: [
      { title: "Rich Multi-Omics Database with 6 Data Modalities", detail: "15 tables, 461,522 total rows covering TnSeq essentiality (58% of genes), FBA metabolic flux (15%), mutant growth fitness on 8 carbon sources (39%), proteomics across 7 strains (41%), pangenome classification (54%), and functional annotations via COG/KO/Pfam." },
      { title: "Strong BERDL Connectivity: 4 of 5 Connection Types >90%", detail: "100% genome ID match, 91% reaction match to ModelSEED biochemistry, 100% compound match, 100% pangenome cluster match via gene junction table. Only ADP1 Fitness Browser presence was absent — making the mutant growth data a unique resource in K-BERDL." },
      { title: "FBA and TnSeq Essentiality Agree 74% of the Time", detail: "Of 866 genes with both FBA flux predictions and TnSeq essentiality calls, 639 (73.8%) are concordant. The 26% discordance are candidates for model refinement. Essentiality differs between minimal media (499 essential) and LB (346 essential)." },
      { title: "Highly Conserved Core Metabolism Across 14 Genomes", detail: "94% of 1,330 metabolic reactions are shared across all 14 Acinetobacter genomes (core), with only 20 genome-unique reactions. Gapfilling accounts for 7.7% of reactions on average. 87% of growth phenotype predictions depend on at least one gapfilled reaction." },
    ],
    tenants: ["kbase", "kessence", "phagefoundry"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.genome", "kbase_ke_pangenome.gene_cluster", "kbase_msd_biochemistry.reaction", "kbase_uniref50/90/100"],
      kessence: ["kescience_fitnessbrowser.organism"],
      phagefoundry: ["phagefoundry_acinetobacter_genome_browser (37 tables)"],
    },
    notebooks: [
      { step: "01", name: "01_database_exploration.ipynb", purpose: "Full inventory of the SQLite database — tables, schemas, NULL coverage, distributions" },
      { step: "02", name: "02_berdl_connection_scan.ipynb", purpose: "BERDL connection validation via Spark queries across 5 identifier types" },
      { step: "03", name: "03_cluster_id_mapping.ipynb", purpose: "Pangenome cluster ID bridge construction (mmseqs2 ↔ BERDL centroid IDs)" },
      { step: "04", name: "04_gene_essentiality_and_fitness.ipynb", purpose: "Multi-omics: essentiality, FBA concordance, fitness distributions, proteomics" },
      { step: "05", name: "05_metabolic_model_and_phenotypes.ipynb", purpose: "Metabolic model analysis: gapfilling, reaction conservation, growth predictions" },
    ],
    figures: ["data_coverage_by_modality.png", "fba_tnseq_concordance.png", "essentiality_overview.png", "growth_condition_correlation.png", "reaction_conservation.png", "annotation_by_essentiality.png"],
  },
  {
    id: "adp1_deletion_phenotypes",
    title: "ADP1 Deletion Phenotypes",
    subtitle: "Condition-dependent gene essentiality",
    status: "complete", category: "Phenomics", categoryColor: "#10b981",
    author: "Paramvir Dehal · LBNL", year: 2026,
    tags: ["phenomics", "fitness", "genomics", "carbon sources"],
    researchQuestion: "What is the condition-dependent structure of gene essentiality in Acinetobacter baylyi ADP1, as revealed by the de Berardinis single-gene deletion collection grown on 8 carbon sources?",
    overview: "Phenotype-first analysis of a 2,034×8 complete growth matrix from the de Berardinis deletion collection. Investigates which carbon sources produce redundant vs independent essentiality profiles, discovers functionally coherent gene modules with correlated growth defects, and characterizes genes with condition-specific importance. FBA is deliberately excluded — a prior project showed FBA class adds no predictive value for growth defects among dispensable genes (p=0.63).",
    keyFindings: [
      { title: "Phenotype Landscape Has ~5 Independent Dimensions", detail: "PCA of the 2,034×8 growth matrix reveals that the phenotype space is a continuum with approximately 5 independent axes, not distinct clusters. This suggests carbon source essentiality varies along continuous metabolic gradients." },
      { title: "625 Condition-Specific Genes Map to Expected Pathways", detail: "Genes with condition-specific growth defects map precisely to expected metabolic pathways — quinate-specific genes to aromatic catabolism, urea-specific genes to nitrogen metabolism, glucose-specific to glycolysis, confirming the biological validity of the analysis." },
      { title: "Urea and Quinate Are Most Phenotypically Distinct", detail: "Carbon source correlation analysis shows urea (r≈0.12) and quinate (r≈0.11) are nearly uncorrelated with all others, indicating largely independent gene sets. Butanediol-acetate and butanediol-lactate are most similar (r=0.58)." },
      { title: "TnSeq Gap Coverage Reveals Unevenly Sampled Gene Space", detail: "Genes classified as essential by TnSeq but lacking deletion mutant data show distinct length and annotation patterns, highlighting the complementarity of TnSeq and deletion collection approaches." },
    ],
    tenants: ["kbase"],
    tenantTables: { kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.eggnog_mapper_annotations"] },
    notebooks: [
      { step: "01", name: "01_data_extraction.ipynb", purpose: "Extract ADP1 growth matrix and annotation data from SQLite database" },
      { step: "02", name: "02_condition_structure.ipynb", purpose: "PCA, correlation analysis, and dimensionality of the 8-condition phenotype space" },
      { step: "03", name: "03_gene_modules.ipynb", purpose: "Hierarchical clustering and ICA to identify co-defective gene modules" },
      { step: "04", name: "04_condition_specific.ipynb", purpose: "Identify and characterize genes with condition-specific growth defects" },
      { step: "05", name: "05_tnseq_gap.ipynb", purpose: "Profile genes with TnSeq classifications but no deletion mutant data" },
    ],
    figures: ["pca_biplot.png", "condition_correlations.png", "condition_specific_heatmap.png", "gene_heatmap.png", "growth_distributions.png", "module_profiles.png"],
  },
  {
    id: "adp1_triple_essentiality",
    title: "ADP1 Triple Essentiality",
    subtitle: "FBA · TnSeq · Growth concordance",
    status: "complete", category: "Metabolic Modeling", categoryColor: "#8b5cf6",
    author: "Paramvir Dehal · LBNL", year: 2026,
    tags: ["metabolic modeling", "essentiality", "FBA", "fitness"],
    researchQuestion: "Among genes that TnSeq says are dispensable in A. baylyi ADP1, does FBA correctly predict which ones have growth defects? Can mutant growth rates serve as an independent axis to evaluate where computational and genetic methods agree or disagree?",
    overview: "Adds mutant growth rates on 8 carbon sources as a third independent experimental axis alongside FBA predictions and TnSeq essentiality. All 478 triple-covered genes are TnSeq-dispensable on minimal media — biologically expected since TnSeq-essential genes have no viable deletion mutants. The analysis therefore asks: among dispensable genes, does FBA correctly predict which ones matter for growth?",
    keyFindings: [
      { title: "FBA Does Not Predict Growth Defects Among Dispensable Genes", detail: "Chi-squared test across all conditions: p=0.63. FBA essentiality class (essential/blocked/variable/inactive) shows no statistically significant association with whether a dispensable gene causes a growth defect when deleted." },
      { title: "478 Triple-Covered Genes Analyzed", detail: "Of 5,852 ADP1 genes, 478 have TnSeq + FBA + growth data. All are TnSeq-dispensable on minimal media. This is the complete set available for three-way concordance analysis, covering 6 of 8 carbon sources with condition-matched FBA predictions." },
      { title: "Condition-Specific Discordance Patterns Revealed", detail: "While the overall p-value is non-significant, specific conditions (glucose, acetate) show slightly stronger FBA-growth correlations than others (urea, quinate), suggesting condition-dependent limitations of FBA at capturing accessory metabolism." },
      { title: "Pangenome Conservation Weakly Associates with Discordance", detail: "Genes where FBA and growth disagree tend to be in more accessory pangenome positions, suggesting that poorly conserved genes may have functions not captured by core metabolic models." },
    ],
    tenants: ["kbase"],
    tenantTables: { kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.gene_genecluster_junction"] },
    notebooks: [
      { step: "01a", name: "01_build_essentiality_vectors.ipynb", purpose: "Build TnSeq-based essentiality call vectors from insertion density" },
      { step: "01b", name: "01_data_assembly.ipynb", purpose: "Integrate TnSeq, FBA, and growth data; build triple-covered gene set" },
      { step: "02a", name: "02_concordance_analysis.ipynb", purpose: "Statistical tests of FBA vs growth concordance across conditions" },
      { step: "02b", name: "02_refined_concordance_analysis.ipynb", purpose: "Refined concordance analysis with improved thresholds and controls" },
      { step: "03", name: "03_discordant_characterization.ipynb", purpose: "Profile discordant genes by function, pangenome status, and annotation" },
    ],
    figures: ["fba_growth_concordance.png", "data_assembly_overview.png", "discordance_analysis.png", "roc_comprehensive.png", "growth_by_fba_class.png", "pangenome_discordance.png"],
  },
  {
    id: "amr_pangenome_atlas",
    title: "Pan-Bacterial AMR Gene Atlas",
    subtitle: "27,000 species · 132M gene clusters",
    status: "complete", category: "Antimicrobial Resistance", categoryColor: "#ef4444",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["AMR", "pangenomics", "antibiotic resistance", "phylogenomics"],
    researchQuestion: "What is the distribution, conservation, phylogenetic structure, functional context, and environmental association of antimicrobial resistance (AMR) genes across 27,000 bacterial species pangenomes?",
    overview: "The first comprehensive, pangenome-aware survey of AMR genes at scale, using AMRFinderPlus annotations (via Bakta v1.12.0) on 83,008 gene cluster representatives across 132M total clusters in 27,690 species. Examines conservation patterns, phylogenetic hotspots, resistance mechanisms, functional co-occurrence, environmental associations, and \"AMR-only dark matter\" clusters lacking other functional annotations.",
    keyFindings: [
      { title: "AMR Genes Enriched in the Accessory Genome", detail: "AMR gene clusters are significantly under-represented in the core genome compared to the pangenome average (~47% core baseline), consistent with conditional selection dependent on antibiotic exposure environments. Accessory AMR clusters are the rule, not the exception." },
      { title: "Clinical and Host-Associated Isolates Carry Distinct AMR Profiles", detail: "Species from host-associated environments (especially clinical) carry significantly more and different AMR genes than environmental isolates. AlphaEarth environmental metadata enables the first pan-bacterial environmental stratification of resistance profiles." },
      { title: "Resistance Hotspots Concentrated in Specific Lineages", detail: "AMR gene density is highly non-uniform across the bacterial tree. Pseudomonadota and Bacillota are top AMR hotspots. AMR density correlates positively with pangenome openness — organisms with large accessory genomes carry more resistance genes." },
      { title: "Substantial AMR Dark Matter Identified", detail: "A subset of AMRFinderPlus-detected clusters lack any other functional annotation (SEED, COG, KEGG), representing potentially novel or poorly characterized resistance mechanisms not present in standard functional databases." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.bakta_amr", "kbase_ke_pangenome.eggnog_mapper_annotations", "kbase_ke_pangenome.gtdb_species_clade"],
      kessence: ["kescience_fitnessbrowser (AMR fitness costs)"],
    },
    notebooks: [
      { step: "01", name: "01_amr_census.ipynb", purpose: "AMR gene prevalence, conservation, and pangenome distribution overview" },
      { step: "02", name: "02_conservation_patterns.ipynb", purpose: "AMR gene conservation patterns across species and phyla" },
      { step: "03", name: "03_phylogenetic_distribution.ipynb", purpose: "AMR density by phylum, lineage hotspots, and pangenome openness correlation" },
      { step: "04", name: "04_functional_context.ipynb", purpose: "Resistance mechanism classification, COG co-occurrence, defense islands" },
      { step: "05", name: "05_environmental_distribution.ipynb", purpose: "AlphaEarth stratification of AMR profiles by isolation environment" },
      { step: "06", name: "06_fitness_crossref.ipynb", purpose: "AMR gene fitness effects in standard lab conditions via Fitness Browser" },
      { step: "07", name: "07_synthesis.ipynb", purpose: "Synthesis of all analyses and generation of final figures" },
    ],
    figures: ["fig1_amr_overview.png", "amr_conservation_vs_baseline.png", "amr_phylum_distribution.png", "amr_by_environment.png", "amr_mechanism_conservation.png", "amr_cog_enrichment.png"],
  },
  {
    id: "aromatic_catabolism_network",
    title: "Aromatic Catabolism Support Network",
    subtitle: "Complex I · Iron · PQQ in ADP1",
    status: "complete", category: "Metabolomics", categoryColor: "#f59e0b",
    author: "Paramvir Dehal · LBNL", year: 2026,
    tags: ["metabolomics", "catabolism", "aromatics", "fitness", "FBA"],
    researchQuestion: "Why does aromatic catabolism in A. baylyi ADP1 require Complex I (NADH dehydrogenase), iron acquisition, and PQQ biosynthesis when growth on other carbon sources does not?",
    overview: "The prior deletion phenotype project identified 51 genes with quinate-specific growth defects, unexpectedly including 10 Complex I subunits, 3 iron acquisition genes, 2 PQQ biosynthesis genes, and 6 transcriptional regulators alongside the 6 core aromatic degradation genes. This project investigates whether these form a coherent metabolic dependency network using FBA predictions across 230 carbon sources, genomic organization analysis, co-fitness networks, and cross-species validation via the Fitness Browser.",
    keyFindings: [
      { title: "51-Gene Support Network Dominated by Complex I (41%)", detail: "The quinate-specific gene set forms a coherent metabolic network: Complex I (21 genes, 41%) for NADH reoxidation, iron acquisition (3 genes) for Fe²⁺-dependent ring-cleavage dioxygenase, PQQ biosynthesis (2 genes) for the quinoprotein quinate dehydrogenase, and transcriptional regulators (6 genes)." },
      { title: "Dependency Is on High-NADH Flux, Not Aromatics Specifically", detail: "FBA predictions across 230 carbon sources show that Complex I requirement is shared with other high-NADH-generating substrates, not aromatic compounds exclusively. The quinate specificity in deletion data reflects the particular combination of NADH flux plus ring-cleavage plus quinoprotein requirements." },
      { title: "Cross-Species Validation Confirms the Network", detail: "Fitness Browser data for organisms with aromatic catabolism genes confirms that Complex I co-fitness with aromatic catabolism genes is conserved across species, not an ADP1-specific artifact." },
      { title: "Genomic Organization Supports Functional Coupling", detail: "Co-fitness network analysis reveals tight clusters corresponding to functional modules. Chromosomal proximity analysis shows that aromatic pathway genes and their support network are not randomly distributed — regulatory co-localization supports the dependency model." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.eggnog_mapper_annotations"],
      kessence: ["kescience_fitnessbrowser.fitness_experiment", "kescience_fitnessbrowser.gene_fitness"],
    },
    notebooks: [
      { step: "01", name: "01_metabolic_dependencies.ipynb", purpose: "Identify metabolic dependencies and NADH hypothesis for aromatic catabolism" },
      { step: "02", name: "02_genomic_organization.ipynb", purpose: "Chromosomal organization, regulatory co-localization, and operon structure" },
      { step: "03", name: "03_cofitness_network.ipynb", purpose: "Co-fitness network analysis and support module identification" },
      { step: "04", name: "04_cross_species.ipynb", purpose: "Cross-species fitness validation across organisms with aromatic catabolism" },
    ],
    figures: ["support_network_categories.png", "cofitness_heatmap.png", "fba_flux_heatmap.png", "cross_species_fitness.png", "chromosome_map.png", "complex_I_vs_background.png"],
  },
  {
    id: "bacdive_metal_validation",
    title: "BacDive Metal Tolerance Validation",
    subtitle: "Environment × predicted metal tolerance",
    status: "complete", category: "Metal Tolerance", categoryColor: "#f97316",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["metal tolerance", "phenomics", "ecology", "BacDive", "validation"],
    researchQuestion: "Do bacteria isolated from metal-contaminated environments have higher predicted metal tolerance scores than bacteria from uncontaminated environments?",
    overview: "Validates Metal Fitness Atlas predictions against BacDive's isolation source metadata for 97K strains. By linking BacDive genome accessions to pangenome species, tests whether organisms from heavy-metal contamination sites, industrial environments, and waste/sludge sites have higher predicted metal tolerance than organisms from host-associated or uncontaminated environments.",
    keyFindings: [
      { title: "Heavy Metal Contamination Isolates Score Significantly Higher", detail: "Heavy metal contamination isolates show significantly elevated metal tolerance scores (d=+1.00, p=0.006) compared to control environments. The effect is dose-dependent: heavy metal > waste/sludge > general contamination > industrial." },
      { title: "Signal Is Phylogenetically Robust", detail: "The association holds within Pseudomonadota and Actinomycetota after phylogenetic stratification, confirming the signal is not entirely driven by lineage-specific enrichment in contaminated environments." },
      { title: "Validated Across 97K BacDive Strains", detail: "Comprehensive validation using BacDive's isolation source metadata for 97,000+ strains provides a uniquely large-scale test of the Metal Fitness Atlas predictions against real ecological data." },
      { title: "Metabolite Utilization Correlates with Metal Scores", detail: "Specific metabolite utilization capabilities in BacDive show correlations with predicted metal tolerance, providing an orthogonal phenotypic validation of the genome-based predictions." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gtdb_species_clade", "kbase_ke_pangenome.genome"],
      kessence: ["kescience_bacdive (97K strains)", "kescience_fitnessbrowser.gene_fitness"],
    },
    notebooks: [
      { step: "01", name: "01_bacdive_pangenome_bridge.ipynb", purpose: "Link BacDive genome accessions to K-BERDL pangenome species" },
      { step: "02", name: "02_environment_metal_scores.ipynb", purpose: "Score isolation environments and test association with metal tolerance" },
      { step: "03", name: "03_metal_utilization.ipynb", purpose: "Test metabolite utilization correlations with metal tolerance predictions" },
    ],
    figures: ["metal_score_by_environment.png", "bridge_summary.png", "utilization_vs_score.png"],
  },
  {
    id: "bacdive_phenotype_metal_tolerance",
    title: "BacDive Phenotype Signatures",
    subtitle: "Predicting metal tolerance from phenotypes",
    status: "complete", category: "Phenomics", categoryColor: "#10b981",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["phenomics", "metal tolerance", "phylogenetics", "machine learning"],
    researchQuestion: "Can BacDive-measured bacterial phenotypes (Gram stain, oxygen tolerance, metabolite utilization, enzyme activities) predict metal tolerance as measured by Fitness Browser experiments and the Metal Fitness Atlas?",
    overview: "Tests whether classical microbiology phenotypes (Gram stain, oxygen tolerance, metabolite utilization) predict genome-based metal tolerance scores. Uses a two-scale design: direct validation against 12 Fitness Browser organisms matched to BacDive, and pangenome-scale validation linking ~3,000–5,000 species via genome accessions.",
    keyFindings: [
      { title: "BacDive Phenotypes Capture Real Signal (R²=0.16)", detail: "Seven of 10 BacDive phenotype features are significant univariately for predicting metal tolerance. Gram stain is the strongest predictor (d=−0.61; Gram-negative bacteria are more metal-tolerant), followed by oxygen tolerance and specific metabolite utilization." },
      { title: "Signal Is Entirely Phylogenetically Confounded", detail: "After adding taxonomy to the model, the phenotype features add essentially no explanatory power (ΔR²=−0.009). The phenotype-metal tolerance association is driven by which lineages dominate contaminated environments, not by intrinsic phenotypic mechanisms." },
      { title: "Genome-Encoded Gene Count Is the True Predictor (R²=0.63)", detail: "Metal resistance gene count (from Metal Fitness Atlas annotations) achieves R²=0.63 in the full model, dramatically outperforming phenotypic predictors. This confirms that genomic functional content, not easily measurable phenotypes, determines metal tolerance." },
      { title: "Urease Effect Reverses Direction After Phylogenetic Control", detail: "Urease activity shows a positive association with metal tolerance univariately (d=+0.18) but reverses after phylogenetic correction (d=−0.18), driven by Actinomycetes enrichment. This is a clear example of ecological confounding in phenotype-based predictions." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.genome", "kbase_ke_pangenome.gtdb_species_clade"],
      kessence: ["kescience_bacdive", "kescience_fitnessbrowser"],
    },
    notebooks: [
      { step: "01", name: "01_bacdive_pangenome_bridge.ipynb", purpose: "Link BacDive phenotype data to pangenome species" },
      { step: "02", name: "02_phenotype_feature_engineering.ipynb", purpose: "Engineer phenotypic feature matrix from BacDive metadata" },
      { step: "03", name: "03_univariate_associations.ipynb", purpose: "Univariate tests of phenotype-metal tolerance associations" },
      { step: "04", name: "04_multivariate_model.ipynb", purpose: "Regression models with and without phylogenetic covariates" },
      { step: "05", name: "05_fb_bacdive_case_studies.ipynb", purpose: "Case studies comparing Fitness Browser and BacDive phenotype predictions" },
    ],
    figures: ["univariate_effect_sizes.png", "shap_summary.png", "model_comparison.png", "fb_bacdive_phenotype_table.png"],
  },
  {
    id: "cofitness_coinheritance",
    title: "Co-fitness Predicts Co-inheritance",
    subtitle: "Functional coupling constrains pangenome evolution",
    status: "complete", category: "Pangenomics", categoryColor: "#0891b2",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["pangenomics", "fitness", "co-evolution", "gene modules"],
    researchQuestion: "Do genes with correlated fitness profiles (co-fit) tend to co-occur in the same genomes across a species' pangenome? Does functional coupling constrain which genes are gained and lost together?",
    overview: "Tests whether lab-measured functional coupling (co-fitness from RB-TnSeq) predicts genome-level co-inheritance (co-occurrence in pangenomes) across 11 bacterial species. Builds on prior work showing fitness modules are 86% core, extending to ask whether the 48 accessory modules show stronger co-inheritance. Phi coefficients measure co-occurrence against prevalence-matched random pairs.",
    keyFindings: [
      { title: "Pairwise Co-fitness Weakly but Consistently Predicts Co-occurrence", detail: "Pairwise co-fitness is a statistically significant but small predictor of pangenome co-inheritance (ΔΦ=+0.003, p=1.66×10⁻²⁹). 7 of 9 organisms show positive associations, confirming the trend is consistent across species despite small effect sizes." },
      { title: "ICA Modules Show 17× Stronger Co-inheritance Signal", detail: "Multi-gene ICA fitness modules show ΔΦ=+0.053 compared to +0.003 for pairwise co-fitness — a 17-fold improvement. Coherent functional gene groups predict co-inheritance far better than individual gene pairs." },
      { title: "73% of Accessory Modules Are Significantly Co-inherited", detail: "Among the 48 accessory ICA modules (genes not in the core genome), 73% show statistically significant co-inheritance (Φ enrichment p<0.05). Functionally coherent gene groups that are absent from some genomes tend to travel together through the pangenome." },
      { title: "Functional Coupling Constrains Horizontal Gene Transfer", detail: "The co-inheritance signal is strongest for operonically organized genes and metabolic pathway modules, suggesting that HGT and gene loss are constrained by functional interdependence — genes that need each other tend to be gained and lost together." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.genome"],
      kessence: ["kescience_fitnessbrowser.gene_fitness", "kescience_fitnessbrowser.fitness_experiment"],
    },
    notebooks: [
      { step: "01", name: "01_data_extraction.ipynb", purpose: "Extract co-fitness and pangenome co-occurrence data from BERDL" },
      { step: "02", name: "02_cooccurrence.ipynb", purpose: "Build pangenome co-occurrence phi coefficient matrices per species" },
      { step: "03", name: "03_module_coinheritance.ipynb", purpose: "ICA module co-inheritance analysis — core vs accessory modules" },
      { step: "04", name: "04_cross_organism.ipynb", purpose: "Cross-organism validation of co-fitness vs co-inheritance relationship" },
    ],
    figures: ["fig1_cofit_cooccurrence.png", "fig5_module_coinheritance.png", "fig4_cofit_strength.png", "fig6_functional.png", "module_coinheritance.png"],
  },
  {
    id: "cog_analysis",
    title: "COG Functional Category Analysis",
    subtitle: "Core vs auxiliary vs novel gene functions",
    status: "complete", category: "Functional Genomics", categoryColor: "#6366f1",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["functional genomics", "COG", "pangenomics", "mobile elements"],
    researchQuestion: "How do COG functional category distributions differ across core, auxiliary, and novel genes in bacterial pangenomes?",
    overview: "Analyzes COG (Clusters of Orthologous Groups) functional category distributions across core, auxiliary, and singleton gene classes in bacterial pangenomes using eggNOG mapper annotations and gene classifications from the BERDL gene_cluster table. Reveals a remarkably consistent two-speed genome pattern holding universally across bacterial phyla.",
    keyFindings: [
      { title: "Universal Two-Speed Genome Pattern Across 9 Phyla", detail: "A consistent functional partitioning is discovered across 32 species and 9 phyla: core genes are enriched in translation, ribosome structure, transcription, and central metabolism; novel genes are consistently enriched in mobile genetic elements and defense functions." },
      { title: "Novel Genes Show +10.88% Enrichment in Mobile Elements", detail: "Across all 32 species, novel (singleton) genes show a large and consistent enrichment in mobile element-associated COG categories (L: Replication, recombination, and repair; X: Mobilome), confirming that the novel genome is largely composed of recent HGT acquisitions." },
      { title: "Novel Genes Also Enriched in Defense Functions (+2.83%)", detail: "Defense mechanism genes (V: Defense mechanisms) are significantly over-represented in novel gene classes, suggesting that newly acquired defense systems drive much of the within-species genetic diversity beyond mobile elements." },
      { title: "Pattern Holds Regardless of Genome Size or Lifestyle", detail: "The core-novel functional partitioning is remarkably consistent regardless of genome size (1.5–8 Mb), lifestyle (pathogen vs environmental), or phylogenetic position — a universal feature of bacterial genome architecture." },
    ],
    tenants: ["kbase"],
    tenantTables: { kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.eggnog_mapper_annotations", "kbase_ke_pangenome.gtdb_species_clade"] },
    notebooks: [
      { step: "01", name: "species_selection_exploration.ipynb", purpose: "Species selection and pangenome data extraction for COG analysis" },
      { step: "02", name: "cog_analysis.ipynb", purpose: "COG category distributions by core/auxiliary/novel gene classes" },
      { step: "03", name: "multi_species_cog_analysis.ipynb", purpose: "Multi-species COG analysis across 32 species and 9 phyla" },
      { step: "04", name: "multi_species_cog_analysis_optimized.ipynb", purpose: "Optimized version with improved Spark performance and extended species set" },
    ],
    figures: [],
  },
  {
    id: "conservation_fitness_synthesis",
    title: "Gene Conservation & Fitness Synthesis",
    subtitle: "Architecture of bacterial genomes",
    status: "complete", category: "Synthesis", categoryColor: "#e11d48",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["synthesis", "pangenomics", "fitness", "evolution", "purifying selection"],
    researchQuestion: "How does a gene's importance for bacterial survival relate to its evolutionary conservation, and what does the conserved genome actually look like?",
    overview: "Synthesis connecting two large-scale datasets — the Fitness Browser (RB-TnSeq mutant fitness for ~194,000 genes across 43 bacteria) and the KBase pangenome (gene cluster conservation across 27,690 microbial species). Draws on four upstream analysis projects to reveal that the conserved genome is the most functionally active part of the genome, not the most inert, and that lab conditions are an impoverished proxy for natural selection.",
    keyFindings: [
      { title: "16 Percentage Point Fitness-Conservation Gradient", detail: "Genes in the core genome are 16 percentage points more likely to show strong fitness effects when disrupted than genes in the accessory genome. Conservation is a meaningful proxy for functional importance, but with substantial noise — not all core genes are essential in lab conditions." },
      { title: "Burden Paradox: Core Genes Are MORE Costly", detail: "Contrary to the genome streamlining model, core genes are more likely to impose fitness burdens when deleted than accessory genes. The paradox is explained by trade-off genes — those important in some conditions but costly in others — which are 1.29× enriched in the core genome." },
      { title: "Lab Conditions Are Impoverished Proxies for Natural Selection", detail: "Selection-signature analysis shows that 28,017 genes are under apparent purifying selection in natural environments despite showing neutral or positive fitness effects in standard lab media. Lab conditions dramatically underestimate the functional importance of core genes." },
      { title: "Conserved Genome Is the Most Functionally Active", detail: "Core genes are enriched in enzymes, regulatory proteins, and transport systems — not inert structural elements. The conserved genome is where most metabolic activity is concentrated, challenging the view that conservation reflects functional conservation of passive housekeeping." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.genome"],
      kessence: ["kescience_fitnessbrowser.gene_fitness", "kescience_fitnessbrowser.fitness_experiment"],
    },
    notebooks: [
      { step: "01", name: "01_summary_figures.ipynb", purpose: "Synthesis of conservation-fitness gradient and selection-signature figures" },
    ],
    figures: ["fitness_conservation_gradient.png", "selection_signature.png", "core_genome_active.png"],
  },
  {
    id: "conservation_vs_fitness",
    title: "Conservation vs Fitness",
    subtitle: "Linking Fitness Browser to pangenome clusters",
    status: "complete", category: "Pangenomics", categoryColor: "#0891b2",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["pangenomics", "fitness", "essential genes", "DIAMOND", "bridge"],
    researchQuestion: "Are essential genes preferentially conserved in the core genome, and what functional categories distinguish essential-core from essential-auxiliary genes?",
    overview: "Builds the bridge between the Fitness Browser (~221K genes, 48 bacteria) and the KBase pangenome (132.5M gene clusters) via DIAMOND blastp mapping. Identifies putative essential genes (no viable transposon mutants), and tests whether essential genes are enriched in core clusters across 33 organisms.",
    keyFindings: [
      { title: "177,863 Gene-to-Cluster Links Successfully Built", detail: "DIAMOND blastp mapping of 221K Fitness Browser genes against pangenome cluster representatives achieves 177,863 high-confidence links across 48 bacteria — the foundational bridge enabling all downstream fitness-pangenome analyses." },
      { title: "Essential Genes Are 86% Core (OR=1.56) Across 33 Organisms", detail: "Putative essential genes (defined as genes with no viable transposon insertions in RB-TnSeq) are enriched in the core genome in 33 of 33 organisms tested (OR=1.56, p<0.001 by meta-analysis), confirming that evolutionary conservation and functional essentiality are positively correlated." },
      { title: "Essential-Core and Essential-Auxiliary Have Distinct Functional Profiles", detail: "Essential-core genes are enzyme-rich and well-annotated (high SEED/COG coverage), while essential-auxiliary genes are poorly characterized with low annotation coverage — representing potential novel essential functions specific to particular lineages or environments." },
      { title: "Identity Distribution Validates Mapping Quality", detail: "The DIAMOND alignment identity distribution shows a bimodal pattern separating close homologs (>80% identity) from distant homologs, confirming that the mapping captures biologically meaningful gene-cluster relationships at appropriate evolutionary distances." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.eggnog_mapper_annotations"],
      kessence: ["kescience_fitnessbrowser.gene", "kescience_fitnessbrowser.fitness_experiment"],
    },
    notebooks: [
      { step: "01", name: "01_organism_mapping.ipynb", purpose: "Map Fitness Browser organisms to BERDL pangenome species" },
      { step: "02", name: "02_extract_cluster_reps.ipynb", purpose: "Extract cluster representative sequences for DIAMOND alignment" },
      { step: "03", name: "03_build_link_table.ipynb", purpose: "Build gene-cluster link table via DIAMOND blastp" },
      { step: "04", name: "04_essential_conservation.ipynb", purpose: "Forest plot meta-analysis of essential gene core enrichment across 33 organisms" },
    ],
    figures: ["essential_vs_core_forest_plot.png", "identity_distributions.png", "essential_enrichment_by_context.png", "essential_seed_toplevel_heatmap.png", "essential_enzyme_breakdown.png"],
  },
  {
    id: "core_gene_tradeoffs",
    title: "Core Gene Burden Paradox",
    subtitle: "Why are core genes more costly?",
    status: "complete", category: "Evolutionary Genomics", categoryColor: "#7c3aed",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["evolutionary genomics", "pangenomics", "fitness burden", "trade-offs"],
    researchQuestion: "Why are core genome genes MORE likely to show positive fitness effects when deleted, and what functions and conditions drive this burden paradox?",
    overview: "Dissects why core genes are more burdensome than accessory genes — a finding from fitness_effects_conservation that contradicts the genome streamlining model. Reveals that the paradox is function-specific, that trade-off genes are enriched in core, and constructs a selection-signature matrix identifying 28,017 genes under purifying selection despite appearing costly in lab conditions.",
    keyFindings: [
      { title: "Burden Paradox Driven by Motility, RNA, and Protein Metabolism", detail: "The core gene burden paradox is function-specific: motility (flagellar assembly), RNA metabolism, and protein metabolism functions account for the majority of costly core genes. These are large investment systems that are costly in lab media but provide fitness in natural environments." },
      { title: "Trade-off Genes Are 1.29× Enriched in the Core Genome", detail: "Genes that are important (essential) in some conditions and costly in others are significantly enriched in the core genome (OR=1.29). This enrichment explains much of the burden paradox — the core genome contains a disproportionate share of condition-dependent trade-off genes." },
      { title: "28,017 Genes Under Purifying Selection Identified", detail: "The selection-signature matrix identifies 28,017 genes that are maintained despite apparent fitness costs in lab conditions, suggesting these genes provide benefits in natural environments not captured by standard lab growth assays." },
      { title: "Accessory Genes Are Mostly Neutral, Not Costly", detail: "Contrary to some predictions, accessory genes are primarily neutral in lab conditions, not costly. The expensive-accessory gene hypothesis (mobile elements impose fitness costs) accounts for only a minority of accessory genes." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.eggnog_mapper_annotations"],
      kessence: ["kescience_fitnessbrowser.gene_fitness", "kescience_fitnessbrowser.fitness_experiment"],
    },
    notebooks: [
      { step: "01", name: "01_burden_anatomy.ipynb", purpose: "Dissect core gene burden by function, condition, and conservation category" },
    ],
    figures: ["burden_by_function.png", "tradeoff_genes_conservation.png", "selection_signature_matrix.png", "burden_by_condition.png", "motility_case_study.png"],
  },
  {
    id: "costly_dispensable_genes",
    title: "Costly + Dispensable Genes",
    subtitle: "Mobile element debris in the genome",
    status: "complete", category: "Evolutionary Genomics", categoryColor: "#7c3aed",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["evolutionary genomics", "mobile elements", "HGT", "pangenomics"],
    researchQuestion: "What characterizes genes that are simultaneously burdensome (fitness improves when deleted) and not conserved in the pangenome? Are they mobile elements, recent acquisitions, degraded pathways, or something else?",
    overview: "Characterizes the 5,526 costly+dispensable genes from the selection-signature matrix (genes showing fitness burden AND low pangenome conservation). Tests the hypothesis that these represent recent horizontal gene transfer acquisitions in various stages of degeneration, using functional annotation enrichment (SEED, KEGG), ortholog breadth analysis, gene length distributions, and per-organism variation.",
    keyFindings: [
      { title: "Predominantly Mobile Genetic Element Debris", detail: "Costly+dispensable genes show 7.45× keyword enrichment for mobile element terms (transposon, phage, insertion sequence, integrase) and 11.7× enrichment in Phage/Transposon SEED subsystems compared to background. The dominant class is recently integrated mobile genetic element remnants." },
      { title: "Poorly Annotated: 51% vs 75% SEED Coverage", detail: "Only 51% of costly+dispensable genes have SEED functional annotations compared to 75% for the genome average. Low annotation coverage reflects the novelty and HGT origin of these sequences — they are underrepresented in curated functional databases." },
      { title: "Taxonomically Restricted: Median Orthogroup Breadth 15 vs 31", detail: "The median orthologous group spans only 15 organisms for costly+dispensable genes compared to 31 for the genome average — half the phylogenetic breadth. This taxonomic restriction is consistent with recent acquisition and ongoing loss from individual lineages." },
      { title: "Shorter Genes: 615 vs 765 bp Average", detail: "Costly+dispensable genes are significantly shorter than the genome average (615 vs 765 bp), consistent with mobile element gene structures (transposases, integrases, insertion sequence elements are typically short) and ongoing degradation of newly integrated sequences." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.eggnog_mapper_annotations"],
      kessence: ["kescience_fitnessbrowser.gene_fitness"],
    },
    notebooks: [
      { step: "01", name: "01_define_quadrants.ipynb", purpose: "Extract 5,526 costly+dispensable genes from selection-signature matrix" },
      { step: "02", name: "02_functional_characterization.ipynb", purpose: "SEED and KEGG annotation enrichment analysis vs genome background" },
      { step: "03", name: "03_evolutionary_context.ipynb", purpose: "Taxonomic breadth, ortholog breadth, and evolutionary context analysis" },
    ],
    figures: ["fig_seed_enrichment.png", "fig_annotation_rate.png", "fig_ortholog_breadth.png", "fig_gene_length.png", "fig_organism_distribution.png"],
  },
  {
    id: "counter_ion_effects",
    title: "Counter Ion Effects on Metal Fitness",
    subtitle: "Chloride confounding in metal experiments",
    status: "complete", category: "Metal Tolerance", categoryColor: "#f97316",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["metal tolerance", "fitness", "methodology", "NaCl", "confounding"],
    researchQuestion: "When bacteria are exposed to metal salts (CoCl₂, NiCl₂, CuCl₂), how much of the observed fitness effect is caused by the metal cation versus the counter anion (chloride)?",
    overview: "Leverages NaCl stress experiments available for 25 metal-tested organisms to decompose the metal fitness signal into a shared-stress component and a metal-specific component. The Fitness Browser's 559 metal experiments predominantly use chloride salts; at high concentrations (e.g., 250 mM CoCl₂ delivers 500 mM Cl⁻), the counter ion itself may cause significant fitness effects. Tests whether Metal Fitness Atlas conclusions remain valid after correcting for this potential confound.",
    keyFindings: [
      { title: "Counter Ions Are NOT the Primary Confound", detail: "NaCl stress accounts for only 39.8% of metal-important gene overlap on average. The Metal Fitness Atlas conclusions remain valid after counter ion correction — the metal signal is real and not primarily driven by chloride toxicity at the concentrations used." },
      { title: "Overlap Reflects Shared Cellular Vulnerability, Not Chloride", detail: "The ~40% overlap between metal-important and NaCl-stress genes reflects shared cellular stress responses (membrane damage, ion homeostasis, envelope integrity) that are triggered by both stressors — not contamination from chloride anions specifically." },
      { title: "Zinc Sulfate (0 mM Cl⁻) Confirms Metal Signal", detail: "Zinc sulfate experiments, which deliver zero chloride, show comparable overlap with NaCl-stress genes as chloride metal salts, confirming that the shared stress biology is due to ionic stress generally, not the chloride counter ion specifically." },
      { title: "Metal Atlas Core Enrichment Robust After Correction", detail: "The Metal Fitness Atlas finding that metal-important genes are enriched in the core pangenome genome is statistically unchanged after removing shared NaCl-stress genes, confirming that the core enrichment is driven by true metal-specific functions." },
    ],
    tenants: ["kbase", "kessence"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.eggnog_mapper_annotations"],
      kessence: ["kescience_fitnessbrowser.gene_fitness", "kescience_fitnessbrowser.fitness_experiment"],
    },
    notebooks: [
      { step: "01", name: "01_nacl_identification.ipynb", purpose: "Identify NaCl-stress experiments in the Fitness Browser database" },
      { step: "02", name: "02_metal_nacl_overlap.ipynb", purpose: "Quantify overlap between metal-important and NaCl-stress gene sets" },
      { step: "03", name: "03_profile_decomposition.ipynb", purpose: "Decompose metal fitness profiles to separate metal-specific from ionic components" },
      { step: "04", name: "04_corrected_atlas.ipynb", purpose: "Generate corrected Metal Fitness Atlas after removing NaCl-shared genes" },
      { step: "05", name: "05_psrch2_comparison.ipynb", purpose: "Validate conclusions using PSRCH2 organism as independent test case" },
    ],
    figures: ["nacl_metal_overlap_heatmap.png", "metal_nacl_overlap_by_counter_ion.png", "atlas_original_vs_corrected.png", "cl_concentration_vs_overlap.png", "zinc_sulfate_validation.png"],
  },
  {
    id: "ecotype_analysis",
    title: "Ecotype Correlation Analysis",
    subtitle: "Environment vs phylogeny in gene content",
    status: "complete", category: "Environmental Genomics", categoryColor: "#16a34a",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["ecology", "pangenomics", "environmental genomics", "AlphaEarth"],
    researchQuestion: "What drives gene content similarity between bacterial genomes: environmental similarity or phylogenetic relatedness?",
    overview: "Tests whether environmental similarity predicts gene content similarity between bacterial genomes after controlling for phylogenetic distance. Uses AlphaEarth environmental embeddings, pairwise ANI, and gene cluster profiles across 172 species, computing partial correlations to disentangle the relative contributions of ecology and evolutionary history to pangenome composition.",
    keyFindings: [
      { title: "Phylogeny Dominates Gene Content Similarity in 60.5% of Species", detail: "Across 172 species, phylogenetic distance (ANI) is the primary predictor of gene content similarity in 60.5% of cases. Median partial correlation: 0.014 for phylogeny vs 0.003 for environment, a 4.7-fold difference." },
      { title: "Environment Effects Are Weak and Mostly Non-Significant", detail: "Environmental similarity (AlphaEarth embeddings) shows a small positive partial correlation with gene content similarity, but is statistically non-significant for most species after controlling for phylogenetic distance." },
      { title: "AlphaEarth Embeddings Enable Pan-Bacterial Eco-Analysis", detail: "This study represents one of the first applications of satellite-derived environmental embeddings (AlphaEarth) to pan-bacterial genomics, providing a scalable method for quantifying ecological relationships at the scale of thousands of species." },
      { title: "Weak Environment Signal Is Consistent Across Phyla", detail: "The pattern of phylogeny > environment holds broadly across Proteobacteria, Firmicutes, Bacteroidetes, and other phyla, suggesting it reflects a fundamental feature of bacterial evolution rather than a lineage-specific phenomenon." },
    ],
    tenants: ["kbase"],
    tenantTables: { kbase: ["kbase_ke_pangenome.gene_cluster", "kbase_ke_pangenome.genome", "kbase_ke_pangenome.gtdb_species_clade"] },
    notebooks: [
      { step: "01", name: "01_data_extraction.ipynb", purpose: "Extract AlphaEarth embeddings, ANI, and gene content data from BERDL" },
      { step: "02", name: "02_ecotype_correlation_analysis.ipynb", purpose: "Compute partial correlations between environment/phylogeny and gene content across 172 species" },
    ],
    figures: ["ecotype_correlation_summary.png", "ecotype_by_category.png", "ecotype_scatter_by_category.png", "environmental_vs_host_comparison.png"],
  },
  {
    id: "ecotype_env_reanalysis",
    title: "Ecotype Reanalysis: Environmental Samples",
    subtitle: "Excluding clinical bias from AlphaEarth data",
    status: "complete", category: "Environmental Genomics", categoryColor: "#16a34a",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["ecology", "pangenomics", "methodology", "clinical bias", "reanalysis"],
    researchQuestion: "Does the environment effect on gene content become stronger when analysis is restricted to genuinely environmental samples, excluding human-associated genomes whose AlphaEarth embeddings reflect hospital satellite imagery?",
    overview: "Extends the ecotype correlation analysis by restricting to genuinely environmental samples after discovering that 38% of AlphaEarth genomes are human-associated (clinical, gut). Hospital AlphaEarth embeddings carry 3.4× weaker geographic signal than environmental samples, potentially masking true ecology-gene content associations. This reanalysis tests whether clinical bias explains the weak environment signal found in the original analysis.",
    keyFindings: [
      { title: "Null Result: Clinical Bias Does Not Explain Weak Environment Signal", detail: "After restricting to genuinely environmental samples and excluding all human-associated genomes, the partial correlation between environmental similarity and gene content is unchanged (p=0.83 for the difference between restricted and full analyses). The null result in the original analysis is not an artifact of clinical genome inclusion." },
      { title: "38% of AlphaEarth Genomes Are Human-Associated", detail: "A major finding of this reanalysis: 38% of the genomes with AlphaEarth embeddings have human-associated isolation sources (clinical, gut, hospital). Their embeddings reflect hospital and urban satellite imagery rather than ecological habitat." },
      { title: "Hospital Imagery Has 3.4× Weaker Geographic Signal", detail: "AlphaEarth embeddings for human-associated genomes show 3.4× weaker geographic clustering than embeddings for environmental isolates, quantifying the degree to which clinical genome metadata degrades ecological signal in these embeddings." },
      { title: "Weak Environment Effect Is Real — Not a Clinical Artifact", detail: "The conclusion that phylogeny dominates environment in predicting bacterial gene content is robust to clinical bias correction. This is a genuine finding about bacterial evolution, not a methodological artifact." },
    ],
    tenants: ["kbase"],
    tenantTables: { kbase: ["kbase_ke_pangenome.genome", "kbase_ke_pangenome.gtdb_species_clade", "kbase_ke_pangenome.gene_cluster"] },
    notebooks: [
      { step: "01", name: "01_environmental_only_reanalysis.ipynb", purpose: "Reanalysis restricted to environmental samples, excluding human-associated genomes" },
    ],
    figures: ["species_classification.png", "partial_corr_by_group.png", "partial_corr_distributions.png", "frac_env_vs_partial_corr.png"],
  },
  {
    id: "enigma_contamination_functional_potential",
    title: "ENIGMA Contamination & Functional Potential",
    subtitle: "Groundwater contamination gradient analysis",
    status: "complete", category: "Environmental Genomics", categoryColor: "#16a34a",
    author: "K-BERDL Research Team", year: 2026,
    tags: ["environmental genomics", "metagenomics", "ecology", "contamination", "uranium"],
    researchQuestion: "Do high-contamination Oak Ridge groundwater communities show enrichment for taxa with higher inferred stress-related functional potential compared with low-contamination communities?",
    overview: "Uses ENIGMA CORAL field data to test whether uranium and co-occurring metal contamination gradients are associated with shifts in inferred community functional potential. Functional potential is estimated by linking ENIGMA taxa to BERDL pangenome annotations and aggregating stress-relevant functional signals (COG defense/mobilome) at the site level. Analysis targets community-level ecological filtering across 108 overlap samples.",
    keyFindings: [
      { title: "Confirmatory Defense Tests Remain Null", detail: "Primary hypothesis tests (COG defense category enrichment with contamination) remain statistically non-significant after bootstrap confidence intervals and global FDR correction across 108 overlapping samples. The null result is robust to multiple testing correction approaches." },
      { title: "Exploratory Coverage-Aware Models Show Conditional Association", detail: "Exploratory analysis using coverage-aware linear models (controlling for sampling depth and community evenness) identifies a conditional positive association between contamination index and defense functional potential — significant in some site strata but not globally." },
      { title: "Contamination-Index Sensitivity Leaves Conclusions Unchanged", detail: "Sensitivity analyses using alternative contamination indices (uranium alone vs combined metal index) and different thresholds for high/low contamination classification do not change the confirmatory null result, confirming robustness." },
      { title: "Species-Proxy Mode Is Coverage-Limited", detail: "ENIGMA taxonomy in the available data extends only to Genus level (no species/strain rows), constraining higher-resolution analysis. Species-proxy mode using uniquely resolved genus-to-clade mappings is implementable but limited by mapping coverage." },
    ],
    tenants: ["kbase", "enigma"],
    tenantTables: {
      kbase: ["kbase_ke_pangenome.eggnog_mapper_annotations", "kbase_ke_pangenome.gtdb_taxonomy_r214v1", "kbase_ke_pangenome.genome"],
      enigma: ["enigma_coral.ddt_brick0000010 (geochemistry)", "enigma_coral.ddt_brick0000459 (community counts)", "enigma_coral.ddt_brick0000454 (taxonomy)", "enigma_coral.sdt_sample"],
    },
    notebooks: [
      { step: "01", name: "01_enigma_extraction_qc.ipynb", purpose: "Extract ENIGMA geochemistry, community counts, and taxonomy from CORAL; validate joins and QC" },
      { step: "02", name: "02_taxonomy_bridge_functional_features.ipynb", purpose: "Map ENIGMA taxa to BERDL pangenome clades and build stress-relevant functional features" },
      { step: "03", name: "03_contamination_functional_models.ipynb", purpose: "Confirmatory and exploratory association tests with bootstrap CI and global FDR" },
    ],
    figures: ["contamination_vs_functional_score.png", "contamination_index_distribution.png", "mapping_coverage_by_mode.png", "confirmatory_defense_vs_contamination.png"],
  },
];

// ── Project list lookup ───────────────────────────────────────────────

const PROJECT_MAP = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));

// ── Tenant → project index (consumed by Sidebar) ─────────────────────

export const PROJECTS_BY_TENANT: Record<string, { id: string; title: string }[]> =
  PROJECTS.reduce<Record<string, { id: string; title: string }[]>>((acc, p) => {
    for (const t of p.tenants) {
      (acc[t] ??= []).push({ id: p.id, title: p.title });
    }
    return acc;
  }, {});

// ── Category icon map ─────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  "Multi-Omics":           "fa-solid fa-layer-group",
  "Phenomics":             "fa-solid fa-flask",
  "Metabolic Modeling":    "fa-solid fa-network-wired",
  "Antimicrobial Resistance": "fa-solid fa-shield-virus",
  "Metabolomics":          "fa-solid fa-vial",
  "Metal Tolerance":       "fa-solid fa-atom",
  "Pangenomics":           "fa-solid fa-dna",
  "Functional Genomics":   "fa-solid fa-microscope",
  "Synthesis":             "fa-solid fa-star",
  "Evolutionary Genomics": "fa-solid fa-tree",
  "Environmental Genomics":"fa-solid fa-leaf",
};

// ── Figure lightbox ───────────────────────────────────────────────────

function FigureLightbox({ projectId, figure, onClose }: { projectId: string; figure: string; onClose: () => void }) {
  return (
    <div className="kd-lightbox" onClick={onClose}>
      <button className="kd-lightbox-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
      <img
        src={`${import.meta.env.BASE_URL}projects/${projectId}/${figure}`}
        alt={figure.replace(".png", "").replace(/_/g, " ")}
        className="kd-lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="kd-lightbox-caption">{figure.replace(".png", "").replace(/_/g, " ")}</p>
    </div>
  );
}

// ── Project list page ─────────────────────────────────────────────────

const CATEGORY_FILTERS = ["All", ...Array.from(new Set(PROJECTS.map((p) => p.category))).sort()];

export function ProjectListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  const visible = filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter);

  return (
    <div className="kd-list-page">
      <div className="kd-list-header">
        <h2 className="kd-list-title">My Projects</h2>
        <p className="kd-list-sub">{PROJECTS.length} research projects · Knowledge dashboards powered by K-BERDL</p>
      </div>

      {/* Category filters */}
      <div className="kd-list-filters">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            className={`kd-cat-btn${filter === cat ? " kd-cat-btn--active" : ""}`}
            onClick={() => setFilter(cat)}
          >
            {cat !== "All" && <i className={`${CATEGORY_ICONS[cat] ?? "fa-solid fa-flask"} kd-cat-icon`} />}
            {cat}
            <span className="kd-cat-count">
              {cat === "All" ? PROJECTS.length : PROJECTS.filter((p) => p.category === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Project grid */}
      <div className="kd-project-grid">
        {visible.map((project) => (
          <div
            key={project.id}
            className="kd-project-card"
            style={{ borderTopColor: project.categoryColor }}
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <div className="kd-pc-top">
              <div className="kd-pc-icon" style={{ background: project.categoryColor + "18", color: project.categoryColor }}>
                <i className={CATEGORY_ICONS[project.category] ?? "fa-solid fa-flask"} />
              </div>
              <div>
                <span className="kd-pc-category" style={{ color: project.categoryColor }}>{project.category}</span>
                <span className={`kd-pc-status kd-pc-status--${project.status}`}>
                  <i className={`fa-solid ${project.status === "complete" ? "fa-circle-check" : "fa-circle-half-stroke"}`} />
                  {project.status === "complete" ? "Complete" : "In Progress"}
                </span>
              </div>
            </div>

            <h3 className="kd-pc-title">{project.title}</h3>
            {project.subtitle && <p className="kd-pc-subtitle">{project.subtitle}</p>}

            <p className="kd-pc-rq">{project.researchQuestion}</p>

            <div className="kd-pc-footer">
              <div className="kd-pc-tenants">
                {project.tenants.slice(0, 3).map((t) => (
                  <span key={t} className="kd-pc-tenant-dot" style={{ background: TENANT_COLORS[t] ?? "#607d8b" }} title={TENANT_LABELS[t] ?? t} />
                ))}
                {project.tenants.length > 3 && <span className="kd-pc-tenant-more">+{project.tenants.length - 3}</span>}
              </div>
              <div className="kd-pc-meta">
                <span><i className="fa-solid fa-book" /> {project.notebooks.length}</span>
                <span><i className="fa-solid fa-image" /> {project.figures.length}</span>
              </div>
              <span className="kd-pc-year">{project.year}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Individual Knowledge Dashboard ────────────────────────────────────

export default function KnowledgeDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const [lightboxFig, setLightboxFig] = useState<string | null>(null);

  const fromParam = searchParams.get("from"); // e.g. "tenant:enigma" or null
  const fromTenant = fromParam?.startsWith("tenant:") ? fromParam.slice(7) : null;
  const backLabel  = fromTenant
    ? `${TENANT_LABELS[fromTenant] ?? fromTenant} Discovery Catalog`
    : "All Projects";
  const backTo     = "/projects";

  // Full current path (including from param) — passed to notebook links so
  // the notebook viewer can return here.
  const selfPath = `/projects/${projectId}${fromParam ? `?from=${fromParam}` : ""}`;

  const project = projectId ? PROJECT_MAP[projectId] : null;

  if (!project) {
    return (
      <div className="kd-not-found">
        <i className="fa-solid fa-circle-exclamation" />
        <h2>Project not found</h2>
        <Link to="/projects">← Back to projects</Link>
      </div>
    );
  }

  const catIcon = CATEGORY_ICONS[project.category] ?? "fa-solid fa-flask";

  return (
    <div className="kd-page">
      {lightboxFig && (
        <FigureLightbox
          projectId={project.id}
          figure={lightboxFig}
          onClose={() => setLightboxFig(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="kd-header" style={{ borderTopColor: project.categoryColor }}>
        <Link to={backTo} className="kd-back-btn">
          <i className="fa-solid fa-arrow-left" /> {backLabel}
        </Link>

        <div className="kd-header-meta">
          <span className="kd-category-badge" style={{ background: project.categoryColor + "18", color: project.categoryColor }}>
            <i className={catIcon} /> {project.category}
          </span>
          <span className={`kd-status-badge kd-status-badge--${project.status}`}>
            <i className={`fa-solid ${project.status === "complete" ? "fa-circle-check" : "fa-circle-half-stroke"}`} />
            {project.status === "complete" ? "Complete" : "In Progress"}
          </span>
          <span className="kd-author-badge">
            <i className="fa-solid fa-user-scientist" /> {project.author}
          </span>
          <span className="kd-year-badge">{project.year}</span>
        </div>

        <h1 className="kd-title">{project.title}</h1>
        {project.subtitle && <p className="kd-subtitle">{project.subtitle}</p>}

        <div className="kd-header-stats">
          <span><i className="fa-solid fa-book" /> {project.notebooks.length} notebooks</span>
          <span><i className="fa-solid fa-image" /> {project.figures.length} figures</span>
          <span><i className="fa-solid fa-database" /> {project.tenants.length} tenant{project.tenants.length !== 1 ? "s" : ""}</span>
          <span><i className="fa-solid fa-tag" /> {project.tags.slice(0, 3).join(" · ")}</span>
        </div>
      </div>

      {/* ── Research Question ── */}
      <section className="kd-rq-section">
        <div className="kd-rq-label">
          <i className="fa-solid fa-circle-question" /> Research Question
        </div>
        <blockquote className="kd-rq-text">{project.researchQuestion}</blockquote>
      </section>

      {/* ── Overview + Tenants side-by-side ── */}
      <div className="kd-two-col">
        <section className="kd-section">
          <h2 className="kd-section-title"><i className="fa-solid fa-align-left" /> Overview</h2>
          <p className="kd-overview-text">{project.overview}</p>
        </section>

        <section className="kd-section kd-tenants-section">
          <h2 className="kd-section-title"><i className="fa-solid fa-database" /> Tenants & Data Sources</h2>
          <div className="kd-tenants-list">
            {project.tenants.map((t) => {
              const color = TENANT_COLORS[t] ?? "#607d8b";
              const tables = project.tenantTables[t] ?? [];
              return (
                <div key={t} className="kd-tenant-item">
                  <div className="kd-tenant-header">
                    <span className="kd-tenant-avatar" style={{ background: color }}>{(TENANT_LABELS[t] ?? t)[0].toUpperCase()}</span>
                    <span className="kd-tenant-name" style={{ color }}>{TENANT_LABELS[t] ?? t}</span>
                  </div>
                  <ul className="kd-tenant-tables">
                    {tables.map((tbl) => (
                      <li key={tbl}><i className="fa-solid fa-table kd-tbl-icon" />{tbl}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── Key Findings ── */}
      <section className="kd-section">
        <h2 className="kd-section-title"><i className="fa-solid fa-lightbulb" /> Key Findings</h2>
        <div className="kd-findings-grid">
          {project.keyFindings.map((f, i) => (
            <div key={i} className="kd-finding-card" style={{ borderLeftColor: project.categoryColor }}>
              <div className="kd-finding-num" style={{ background: project.categoryColor }}>{i + 1}</div>
              <div className="kd-finding-body">
                <h3 className="kd-finding-title">{f.title}</h3>
                <p className="kd-finding-detail">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Analysis Pipeline ── */}
      <section className="kd-section">
        <h2 className="kd-section-title"><i className="fa-solid fa-diagram-project" /> Analysis Pipeline</h2>
        <div className="kd-pipeline">
          {project.notebooks.map((nb, i) => (
            <div key={nb.step} className="kd-pipeline-step">
              <div className="kd-step-connector">
                <div className="kd-step-num" style={{ background: project.categoryColor }}>{nb.step}</div>
                {i < project.notebooks.length - 1 && <div className="kd-step-line" />}
              </div>
              <div className="kd-step-body">
                <div className="kd-step-name">
                  <i className="fa-solid fa-file-code kd-nb-icon" />
                  <Link
                    to={`/tenants/kbase/notebooks?path=${encodeURIComponent(`projects/${project.id}/notebooks/${nb.name}`)}&from=${encodeURIComponent(selfPath)}`}
                    className="kd-nb-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {nb.name}
                  </Link>
                </div>
                <p className="kd-step-purpose">{nb.purpose}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Figure Gallery ── */}
      {project.figures.length > 0 && (
        <section className="kd-section">
          <h2 className="kd-section-title"><i className="fa-solid fa-images" /> Figure Gallery</h2>
          <div className="kd-figure-grid">
            {project.figures.map((fig) => (
              <button
                key={fig}
                className="kd-figure-thumb"
                onClick={() => setLightboxFig(fig)}
                title={fig.replace(".png", "").replace(/_/g, " ")}
              >
                <img
                  src={`${import.meta.env.BASE_URL}projects/${project.id}/${fig}`}
                  alt={fig.replace(".png", "").replace(/_/g, " ")}
                  loading="lazy"
                />
                <span className="kd-figure-caption">{fig.replace(".png", "").replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
