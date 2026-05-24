import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { FEATURES, type FeatureKey } from "../../lib/feature-status";

export const metadata = { title: "Status · SybilShield" };

const GROUPS: { title: string; keys: FeatureKey[] }[] = [
  {
    title: "Core API",
    keys: [
      "apiRegister",
      "apiCreateAnalysis",
      "apiGetResults",
      "apiExportCsv",
      "apiClusters",
      "apiSingleScore",
      "apiBatchScore",
      "apiEntities",
      "apiFeedback",
      "apiAppeals",
    ],
  },
  {
    title: "Detection methods",
    keys: [
      "fundingClustering",
      "behaviorClustering",
      "graphClustering",
      "crossChainLinking",
      "temporalFeatures",
      "mlScoring",
    ],
  },
  {
    title: "Data sources",
    keys: [
      "ensVeterans",
      "powerUsers",
      "gitcoinPassport",
      "layerzeroAmnesty",
      "hopInvestigations",
      "arbitrumSybilList",
      "lineaFilteredList",
    ],
  },
  {
    title: "Providers",
    keys: ["mockProvider", "alchemyProvider", "selfHostedNode"],
  },
  {
    title: "Pipeline",
    keys: ["ingest", "features", "clustering", "scoring", "evidence", "auditLog", "webhooks"],
  },
  {
    title: "Adversarial / drift",
    keys: [
      "adversarialSet",
      "driftDetection",
      "retrainOrchestrator",
      "autoRetrain",
      "feedbackLoop",
    ],
  },
  {
    title: "Frontend pages",
    keys: [
      "pageLanding",
      "pageDocs",
      "pageDashboardOverview",
      "pageAnalysesList",
      "pageAnalysesDetail",
      "pageApiKeys",
      "pageNewAnalysis",
      "pageBilling",
      "pageSettings",
      "pagePricing",
      "pageRoadmap",
      "pageMethodology",
      "pageAbout",
      "pageSecurity",
      "pageAppeal",
      "pageBlog",
      "clusterViz",
    ],
  },
  {
    title: "Billing",
    keys: [
      "freeTier",
      "developerPlan",
      "growthPlan",
      "enterprisePlan",
      "perAnalysisPricing",
      "stripeCards",
      "cryptoCheckout",
      "apiKeyRotation",
      "webhookSubscriptions",
      "usageTracking",
    ],
  },
];

const HUMAN: Partial<Record<FeatureKey, string>> = {
  apiRegister: "POST /v1/account/register",
  apiCreateAnalysis: "POST /v1/analyses",
  apiGetResults: "GET /v1/analyses/:id/results",
  apiExportCsv: "GET /v1/analyses/:id/results/export",
  apiClusters: "GET /v1/analyses/:id/clusters",
  apiSingleScore: "GET /v1/score/:address",
  apiBatchScore: "POST /v1/score/batch",
  apiEntities: "GET /v1/entities/:address",
  apiFeedback: "POST /v1/feedback",
  apiAppeals: "POST /v1/appeals",

  fundingClustering: "Funding-source clustering",
  behaviorClustering: "Behavioral clustering (HDBSCAN)",
  graphClustering: "Graph community detection (Leiden)",
  crossChainLinking: "Cross-chain identity linking",
  temporalFeatures: "Temporal anomaly features",
  mlScoring: "ML ensemble scoring (LightGBM)",

  ensVeterans: "ENS veterans (G2)",
  powerUsers: "Protocol power users (G2)",
  gitcoinPassport: "Gitcoin Passport (G1)",
  layerzeroAmnesty: "LayerZero amnesty list (T1)",
  hopInvestigations: "Hop Protocol investigations (T2)",
  arbitrumSybilList: "Arbitrum Foundation list (T4)",
  lineaFilteredList: "Linea filtered list (T4)",

  mockProvider: "MockProvider (synthetic)",
  alchemyProvider: "AlchemyProvider",
  selfHostedNode: "Self-hosted Erigon/Reth node",

  ingest: "Ingestion stage",
  features: "Feature extraction stage",
  clustering: "Clustering stage",
  scoring: "ML scoring stage",
  evidence: "Evidence generation",
  auditLog: "Audit log writes",
  webhooks: "Webhook delivery (HMAC-SHA256)",

  adversarialSet: "Adversarial test set",
  driftDetection: "PSI drift detection",
  retrainOrchestrator: "Retrain orchestrator",
  autoRetrain: "Auto-retrain on drift alert",
  feedbackLoop: "Feedback-driven label promotion",

  pageLanding: "/",
  pageDocs: "/docs",
  pageDashboardOverview: "/dashboard",
  pageAnalysesList: "/dashboard/analyses",
  pageAnalysesDetail: "/dashboard/analyses/[id]",
  pageApiKeys: "/dashboard/api-keys",
  pageNewAnalysis: "/dashboard/new",
  pageBilling: "/dashboard/billing",
  pageSettings: "/dashboard/settings",
  pagePricing: "/pricing",
  pageRoadmap: "/roadmap",
  pageMethodology: "/methodology",
  pageAbout: "/about",
  pageSecurity: "/security",
  pageAppeal: "/appeal",
  pageBlog: "/blog",
  clusterViz: "Cluster network visualisation",

  freeTier: "Free tier (100 calls/mo)",
  developerPlan: "Developer plan ($499/mo)",
  growthPlan: "Growth plan ($1,499/mo)",
  enterprisePlan: "Enterprise plan",
  perAnalysisPricing: "Per-analysis pricing",
  stripeCards: "Stripe card payments",
  cryptoCheckout: "Crypto checkout (NowPayments)",
  apiKeyRotation: "API key rotation",
  webhookSubscriptions: "Webhook subscriptions",
  usageTracking: "Usage tracking",
};

export default function StatusPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold">Feature status</h1>
        <p className="mt-3 text-zinc-400">
          What's live, what's beta, what's synthetic-sandbox, what's coming. Updated alongside
          each deploy. Source of truth:{" "}
          <code className="font-mono text-emerald-300">/STATUS.md</code> in the repo.
        </p>

        <div className="mt-12 space-y-10">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <div className="mt-4 grid gap-2">
                {g.keys.map((k) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-2"
                  >
                    <span className="text-sm">{HUMAN[k] ?? k}</span>
                    <StatusBadge status={FEATURES[k]} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
