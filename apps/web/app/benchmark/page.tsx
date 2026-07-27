import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = {
  title: "Accuracy · SybilShield",
  description:
    "SybilShield's own honest-holdout accuracy numbers — self-reported only, no named-competitor comparisons.",
};

export default function BenchmarkPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-14">
        <header>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">// accuracy</p>
          <h1 className="mt-2 text-4xl font-bold">Our own numbers, not a scoreboard</h1>
          <p className="mt-3 text-zinc-400">
            No Sybil-detection vendor publishes their own false-positive rate. Here are ours —
            self-reported, methodology attached, fully reproducible. This page is deliberately{" "}
            <strong className="text-zinc-200">not</strong> a &ldquo;SybilShield vs. Trusta vs.
            Nansen&rdquo; leaderboard — see{" "}
            <a href="#why-no-competitor-numbers" className="text-emerald-400 hover:underline">
              why
            </a>{" "}
            below. For a feature-by-feature comparison, see{" "}
            <a href="/compare" className="text-emerald-400 hover:underline">
              /compare
            </a>
            .
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-semibold">Preset calibration retro — 600 real wallets</h2>
          <p className="mt-3 text-zinc-300">
            Before shipping the <code className="font-mono text-emerald-300">airdrop</code> preset,
            we ran it against 600 addresses with real ground truth — and found it flagged 66% of
            confirmed genuine governance voters. Full writeup:{" "}
            <a href="/blog/preset-calibration" className="text-emerald-400 hover:underline">
              /blog/preset-calibration
            </a>
            .
          </p>

          <div className="mt-6 overflow-x-auto rounded border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left">sample (n=200 each)</th>
                  <th className="px-4 py-2 text-left">before calibration</th>
                  <th className="px-4 py-2 text-left">after calibration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                <tr className="bg-zinc-950">
                  <td className="px-4 py-2 text-zinc-300">LayerZero T1 (confessed sybils)</td>
                  <td className="px-4 py-2 text-emerald-400">200/200 DROP — 100% recall</td>
                  <td className="px-4 py-2 text-emerald-400">200/200 DROP — 100% recall</td>
                </tr>
                <tr className="bg-zinc-950">
                  <td className="px-4 py-2 text-zinc-300">Arbitrum T4 (sybil list)</td>
                  <td className="px-4 py-2 text-emerald-400">200/200 DROP — 100% recall</td>
                  <td className="px-4 py-2 text-emerald-400">200/200 DROP — 100% recall</td>
                </tr>
                <tr className="bg-zinc-950">
                  <td className="px-4 py-2 text-zinc-300">Governance G2 (confirmed genuine voters)</td>
                  <td className="px-4 py-2 text-rose-400">132/200 DROP — 66% false-positive</td>
                  <td className="px-4 py-2 text-emerald-400">0/200 DROP — 0% false-positive</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            The &ldquo;after&rdquo; column&apos;s 0% is specifically the hard-DROP false-positive
            rate. 60 of the 200 genuine voters (30%) still landed in REVIEW, not a clean pass —
            real cluster co-residents (shared funder or behavior), some plausibly legitimate
            (multisig signers, delegate aggregators), routed to manual review rather than auto-cleared
            or auto-dropped. That&apos;s what REVIEW is for.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">ML holdout metrics — model v0.5.0-gov-expanded</h2>
          <p className="mt-3 text-zinc-300">
            Held out 30 sybil (T1+T2 hand-verified) + 30 genuine (G2) addresses, never seen at
            training. Full writeup:{" "}
            <a href="/blog/v05-real-corpus" className="text-emerald-400 hover:underline">
              /blog/v05-real-corpus
            </a>
            .
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Precision @ 70", "1.000"],
              ["Recall @ 70", "1.000"],
              ["F1 @ 70", "1.000"],
              ["ROC-AUC", "1.000"],
              ["FPR on G1", "0.000"],
              ["Adversarial recall", "1.000"],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
                <div className="mt-1 font-mono text-2xl text-emerald-300">{value}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            n_train=900 · n_holdout_sybil=30 · n_holdout_genuine=30. Adversarial recall was 0.000
            on the previous model version — this is a real improvement, not a static number.
          </p>
        </section>

        <section className="rounded-lg border border-amber-700/40 bg-amber-900/10 p-6">
          <h2 className="text-xl font-semibold text-amber-300">What these numbers do NOT mean</h2>
          <ul className="mt-4 space-y-3 text-sm text-zinc-300">
            <li>
              · <strong className="text-zinc-100">Not wild-traffic-calibrated.</strong> Every number
              above is honest-holdout, on a small, curated, hand-labelled set — not a claim about
              your address list. The 60-address ML holdout split is trivially separable by construction
              (confessed sybils vs. governance voters look very different even before feature
              engineering); a much simpler classifier would likely score similarly on this exact split.
            </li>
            <li>
              · <strong className="text-zinc-100">The genuine pool is still small (~1,700
              addresses).</strong> A brand-new wallet with no governance history looks statistically
              different from our current &ldquo;this is fine&rdquo; examples — false-positive rate on
              small/new accounts is a genuinely open question until wild-traffic feedback exists.
            </li>
            <li>
              · <strong className="text-zinc-100">These numbers will move.</strong> As the genuine
              corpus grows (Gitcoin Passport G1 integration is on the roadmap — ~1,700 → ~50,000) and
              real customer feedback accumulates via the thumbs-up/down on every verdict, expect these
              figures to be re-published, not quietly left stale.
            </li>
          </ul>
        </section>

        <section id="why-no-competitor-numbers">
          <h2 className="text-2xl font-semibold">Why no competitor numbers here</h2>
          <p className="mt-3 text-zinc-300">
            We don&apos;t have access to any other vendor&apos;s ground truth, methodology, or real
            false-positive rate — publishing a number we can&apos;t actually verify, attached to
            another project&apos;s name, isn&apos;t honest benchmarking, it&apos;s a claim we can&apos;t
            back up. If you run a filter today, the retro above is written so you can reproduce it
            against your own: pick a sample of confirmed genuine governance voters from your chain&apos;s
            biggest DAOs (all public data) and check what fraction your filter flags. If it&apos;s above
            a few percent, you likely have the same root cause we found — shared-funder clusters from
            ordinary CEX withdrawals being treated as sybil signal.
          </p>
        </section>

        <section className="text-sm text-zinc-500">
          <p>
            Every method, threshold, and the model artifact&apos;s hashes are open-source and
            reproducible — see{" "}
            <a href="/methodology" className="text-emerald-400 hover:underline">
              /methodology
            </a>{" "}
            and the{" "}
            <a
              href="https://github.com/Dev-In-Crypt/Sybil-Shield-"
              className="text-emerald-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              public repo
            </a>
            . Found a wallet we called wrong?{" "}
            <a href="/appeal" className="text-emerald-400 hover:underline">
              File an appeal
            </a>{" "}
            — 48h SLA, full audit trail.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
