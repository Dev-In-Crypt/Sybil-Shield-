import Link from "next/link";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Blog · SybilShield" };

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  published: boolean;
};

const POSTS: Post[] = [
  {
    slug: "v05-real-corpus",
    title: "Trained on 1000 real wallets: what we learned",
    excerpt:
      "v0.5.0 ships the first real-Alchemy training corpus + on-chain governance-voters as a new genuine source (170 → 1,669, 10x). Adversarial recall went 0.0 → 1.0. Honest holdout limits explained.",
    date: "2026-05-25",
    published: true,
  },
  {
    slug: "linea-retro",
    title: "Replicating Linea's filter: 478K agreement, 45K candidates they missed",
    excerpt:
      "Public retro-analysis of the Linea airdrop filter results. Aggregate-only. We agree with Linea on 478K addresses, disagree on 39K, and identified 45K candidates their filter missed.",
    date: "2026-05-26",
    published: true,
  },
  {
    slug: "why-30s-is-the-tell",
    title: "Why 30 seconds is the tell: detecting scripted wallets via inter-tx timing",
    excerpt:
      "Real users transact at irregular, human-paced intervals. Sybil farms running shell scripts produce inter-tx gaps with characteristically low variance and high lag-1 autocorrelation. Here's why.",
    date: "Coming soon",
    published: false,
  },
  {
    slug: "label-tiers",
    title: "Why training on Trusta's labels is a trap",
    excerpt:
      "Every public Sybil list is itself an output of a detector. If you train on those, you inherit their false positives. We use a tiered confidence system to avoid this.",
    date: "Coming soon",
    published: false,
  },
  {
    slug: "appeals-protocol",
    title: "Designing the appeals protocol",
    excerpt:
      "After LayerZero published their Sybil list, thousands of users complained. We built the appeal flow into the product from day one — here's the spec.",
    date: "Coming soon",
    published: false,
  },
];

export default function BlogPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="mt-3 text-zinc-400">
          Technical posts on detection methodology + public retros on completed airdrops.
        </p>
        <p className="mt-2 text-xs text-amber-300">
          Posts are scheduled to drop together with the first hosted public-good deployment.
          Drafts are in <code className="font-mono">/content/blog</code> in the repo.
        </p>

        <ul className="mt-10 space-y-6">
          {POSTS.map((p) => (
            <li key={p.slug} className={`rounded-lg border p-6 ${p.published ? "border-zinc-800 bg-zinc-900" : "border-zinc-900 bg-zinc-950 opacity-70"}`}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-semibold">
                  {p.published ? (
                    <Link href={`/blog/${p.slug}`} className="hover:text-emerald-300">
                      {p.title}
                    </Link>
                  ) : (
                    <span className="text-zinc-400">{p.title}</span>
                  )}
                </h2>
                <span className={`shrink-0 font-mono text-xs ${p.published ? "text-emerald-400" : "text-zinc-600"}`}>
                  {p.published ? p.date : "// DRAFT"}
                </span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">{p.excerpt}</p>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
