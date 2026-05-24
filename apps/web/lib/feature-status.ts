/**
 * Single source of truth for feature status, imported by all pages.
 * Keep in sync with /STATUS.md at the repo root.
 */

export type Status = "available" | "beta" | "sandbox" | "coming-soon" | "roadmap";

export const STATUS_STYLE: Record<Status, { label: string; className: string }> = {
  available: { label: "Live", className: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40" },
  beta: { label: "Beta", className: "bg-amber-900/40 text-amber-300 border-amber-700/40" },
  sandbox: { label: "Sandbox", className: "bg-sky-900/40 text-sky-300 border-sky-700/40" },
  "coming-soon": { label: "Coming soon", className: "bg-violet-900/40 text-violet-300 border-violet-700/40" },
  roadmap: { label: "Roadmap", className: "bg-zinc-800 text-zinc-400 border-zinc-700" },
};

export const FEATURES = {
  // Core API
  apiRegister: "available",
  apiCreateAnalysis: "available",
  apiGetResults: "available",
  apiExportCsv: "available",
  apiClusters: "available",
  apiSingleScore: "available",
  apiBatchScore: "available",
  apiEntities: "available",
  apiFeedback: "available",
  apiAppeals: "available",

  // Detection
  fundingClustering: "available",
  behaviorClustering: "available",
  graphClustering: "available",
  crossChainLinking: "beta",
  temporalFeatures: "available",
  mlScoring: "beta",

  // Data
  ensVeterans: "available",
  powerUsers: "available",
  gitcoinPassport: "roadmap",
  layerzeroAmnesty: "coming-soon",
  hopInvestigations: "coming-soon",
  arbitrumSybilList: "coming-soon",
  lineaFilteredList: "coming-soon",

  // Providers
  mockProvider: "available",
  alchemyProvider: "available",
  selfHostedNode: "roadmap",

  // Pipeline
  ingest: "available",
  features: "available",
  clustering: "available",
  scoring: "beta",
  evidence: "available",
  auditLog: "available",
  webhooks: "available",

  // Adversarial / drift
  adversarialSet: "available",
  driftDetection: "available",
  retrainOrchestrator: "available",
  autoRetrain: "roadmap",
  feedbackLoop: "beta",

  // Frontend pages
  pageLanding: "available",
  pageDocs: "available",
  pageDashboardOverview: "available",
  pageAnalysesList: "available",
  pageAnalysesDetail: "available",
  pageApiKeys: "available",
  pageNewAnalysis: "roadmap",
  pageBilling: "available",
  pageSettings: "roadmap",
  pagePricing: "available",
  pageRoadmap: "available",
  pageMethodology: "available",
  pageAbout: "available",
  pageSecurity: "available",
  pageAppeal: "available",
  pageBlog: "available",
  clusterViz: "roadmap",

  // Billing
  freeTier: "available",
  developerPlan: "available",
  growthPlan: "available",
  enterprisePlan: "available",
  perAnalysisPricing: "coming-soon",
  stripeCards: "roadmap",
  cryptoCheckout: "available",
  apiKeyRotation: "available",
  webhookSubscriptions: "available",
  usageTracking: "available",
} as const satisfies Record<string, Status>;

export type FeatureKey = keyof typeof FEATURES;

export function getStatus(key: FeatureKey): Status {
  return FEATURES[key];
}
