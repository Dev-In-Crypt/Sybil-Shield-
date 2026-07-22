import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Methodology · SybilShield" };

export default function MethodologyPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <header>
          <h1 className="text-4xl font-bold">Detection methodology</h1>
          <p className="mt-3 text-zinc-400">
            Six detection methods, each with rules anyone can audit and replicate. Source code MIT.
          </p>
        </header>

        <Method
          n={1}
          title="Funding-source clustering"
          file="apps/ml/sybilshield/clustering/funding_cluster.py"
          rules={[
            "Group addresses by their first incoming (non-CEX) funder",
            "Filter out groups with <3 members",
            "Confidence scales by time spread of the funding events: <24h → 0.95, <7d → 0.80, else 0.60",
            "CEX hot wallets (Binance, Coinbase, etc.) are explicitly excluded",
          ]}
        />

        <Method
          n={2}
          title="Behavioral clustering"
          file="apps/ml/sybilshield/clustering/behavior_cluster.py"
          rules={[
            "Build 10-feature vector per address (timing, entropy, protocol diversity, etc.)",
            "Drop zero-variance columns (sigma < 1e-12) to prevent uniform-input failure",
            "z-score normalize, then HDBSCAN with min_cluster_size=5, leaf cluster selection",
            "Fallback: if HDBSCAN returns all-noise AND ≥3 features have zero variance across the batch, treat the whole batch as one Sybil cohort (real-world catch for uniform-script farms)",
            "Intra-cluster spread → confidence (lower spread = higher confidence)",
          ]}
        />

        <Method
          n={3}
          title="Graph community detection"
          file="apps/ml/sybilshield/clustering/graph_community.py"
          rules={[
            "Build directed weighted graph from in-batch transactions (igraph backend, scales to 500K+ nodes)",
            "Run Leiden algorithm via leidenalg (RBConfigurationVertexPartition, resolution=1.0, seed=42)",
            "Filter communities by size (5 ≤ n ≤ 500) and density (≥ 0.3)",
            "Both size and density bounds matter: dense rings are Sybil, but legitimate DEX-using groups also form communities — density threshold cuts them",
          ]}
        />

        <Method
          n={4}
          title="Cross-chain identity linking"
          file="apps/ml/sybilshield/clustering/cross_chain.py"
          rules={[
            "Deterministic: bridge tx from address A on chain X to address B on chain Y → same entity by construction (Stargate + Hop wired today; Across, others planned)",
            "Probabilistic: same funder + same timestamp window (±10min) across chains → likely-same entity",
            "Union-find aggregates into entity components",
            "Cluster fires when ≥3 chain-nodes belong to one entity",
          ]}
        />

        <Method
          n={5}
          title="Temporal anomaly features"
          file="apps/ml/sybilshield/features/temporal.py"
          rules={[
            "Hour-of-day entropy (humans: > 2.5, bots: < 1.5)",
            "Day-of-week entropy",
            "Min inter-tx seconds (humans rarely < 60s)",
            "Burst score (proportion of txs concentrated in 10% of activity window)",
            "Lag-1 autocorrelation of inter-tx gaps (mechanical regularity)",
            "Activity ratio (active days / account age days)",
          ]}
        />

        <Method
          n={6}
          title="ML ensemble scoring"
          file="apps/ml/sybilshield/scoring/train.py"
          rules={[
            "LightGBM binary classifier with class_weight='balanced'",
            "Sample-weighted by confidence tier (T1=4.0, T4=0.8, G1=4.0, G2=2.0)",
            "Trained on ALL tiers (T1-T5 + G1-G2 with weights)",
            "Evaluated on T1+T2 sybil + G1 genuine holdout ONLY - never against T4 detector outputs (which are themselves noisy)",
            "Honest metrics published: P@70, R@70, FPR-on-G1, ROC-AUC, adversarial recall",
          ]}
        />

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold">Label tier system</h2>
          <p className="mt-3 text-zinc-300">
            We do not pretend our labels are perfect. Each labelled address has a tier:
          </p>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-2 py-2">Tier</th>
                <th>Confidence</th>
                <th>Source example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <Tr tier="T1" conf="0.98" src="Confessed via amnesty (LayerZero, Optimism)" />
              <Tr tier="T2" conf="0.95" src="Manually investigated (Hop, security researchers)" />
              <Tr tier="T3" conf="0.85" src="Multiple detectors agree" />
              <Tr tier="T4" conf="0.65" src="Single detector output (raw Arbitrum/Linea lists)" />
              <Tr tier="T5" conf="0.75" src="Self-derived heuristic (shared funder same block)" />
              <Tr tier="G1" conf="0.95" src="Verified human (Gitcoin Passport ≥20 stamps)" />
              <Tr tier="G2" conf="0.80" src="Likely human (ENS pre-2021 + active history)" />
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold">What we DON'T do</h2>
          <ul className="mt-3 space-y-2 text-zinc-300">
            <li>· Score based on token holdings or wealth</li>
            <li>· Penalise addresses for using mixers or privacy tools per se</li>
            <li>· Flag addresses just because they hold a Worldcoin orb proof or any other "humanness" credential</li>
            <li>· Publicly list any individual address as Sybil — only aggregates</li>
            <li>· Train on labels from other commercial detectors (they may be wrong)</li>
            <li>· Charge for the appeal process</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Reproducibility</h2>
          <p className="mt-3 text-zinc-300">
            Every model artifact stores its <code className="font-mono">feature_schema_hash</code> and{" "}
            <code className="font-mono">training_manifest_hash</code>. If you can't reproduce a
            score from the published artifact + manifest hashes, the score is invalid.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Method({
  n,
  title,
  file,
  rules,
}: {
  n: number;
  title: string;
  file: string;
  rules: string[];
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-mono text-emerald-400">#{n}</span>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      <p className="mt-1 font-mono text-xs text-zinc-500">{file}</p>
      <ul className="mt-4 space-y-2 text-zinc-300">
        {rules.map((r) => (
          <li key={r}>· {r}</li>
        ))}
      </ul>
    </section>
  );
}

function Tr({ tier, conf, src }: { tier: string; conf: string; src: string }) {
  return (
    <tr>
      <td className="px-2 py-2 font-mono text-emerald-300">{tier}</td>
      <td className="text-zinc-400">{conf}</td>
      <td className="text-zinc-400">{src}</td>
    </tr>
  );
}
