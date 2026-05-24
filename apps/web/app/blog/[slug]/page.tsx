import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

// content/blog lives inside apps/web so Next.js bundles it for the
// serverless function (process.cwd() resolves to the project root on Vercel).
const BLOG_DIR = path.join(process.cwd(), "content", "blog");

interface PostMeta {
  title?: string;
  date?: string;
  status?: string;
  tags?: string[];
  disclaimer?: string;
}

function parseFrontmatter(md: string): { meta: PostMeta; body: string } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: md };
  const [, frontmatter, body] = match;
  const meta: PostMeta = {};
  for (const line of (frontmatter ?? "").split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!m) continue;
    const [, key, raw] = m;
    if (!key) continue;
    const v = (raw ?? "").trim().replace(/^"|"$/g, "");
    if (key === "tags") {
      meta.tags = v.replace(/[\[\]]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      (meta as Record<string, unknown>)[key] = v;
    }
  }
  return { meta, body: (body ?? "").trim() };
}

async function readPost(slug: string): Promise<{ meta: PostMeta; html: string } | null> {
  try {
    const raw = await fs.readFile(path.join(BLOG_DIR, `${slug}.md`), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const html = await marked.parse(body, { gfm: true, breaks: false });
    return { meta, html };
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const files = await fs.readdir(BLOG_DIR);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ slug: f.replace(/\.md$/, "") }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await readPost(params.slug);
  if (!post) return { title: "Not found · SybilShield" };
  return { title: `${post.meta.title ?? params.slug} · SybilShield` };
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await readPost(params.slug);
  if (!post) notFound();

  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="font-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-emerald-400">
          ← all posts
        </Link>
        <header className="mt-6">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{post.meta.title ?? params.slug}</h1>
          {post.meta.date && (
            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
              {post.meta.date}
              {post.meta.status === "draft" && <span className="ml-2 text-amber-400">// DRAFT</span>}
            </p>
          )}
        </header>
        {post.meta.disclaimer && (
          <aside className="mt-8 rounded border border-amber-700/40 bg-amber-900/10 p-4 text-sm text-amber-200">
            {post.meta.disclaimer}
          </aside>
        )}
        <article
          className="prose prose-invert mt-10 max-w-none prose-headings:font-mono prose-headings:tracking-tight prose-h2:mt-12 prose-h3:mt-8 prose-a:text-emerald-400 prose-code:rounded prose-code:bg-zinc-900 prose-code:px-1 prose-code:py-0.5 prose-code:text-emerald-300 prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-blockquote:border-emerald-500 prose-blockquote:text-zinc-300"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
