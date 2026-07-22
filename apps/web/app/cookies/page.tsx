import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = {
  title: "Cookie policy · SybilShield",
  description: "Cookies and local storage used by SybilShield.",
};

export default function CookiesPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Cookie policy</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">
          Last updated 2026-07-22
        </p>

        <section className="mt-10 space-y-4 text-sm text-zinc-300">
          <p>
            Short version: <strong>we don&apos;t use tracking cookies.</strong> The site uses
            two pieces of client-side storage, both first-party and both strictly functional.
          </p>
        </section>

        <h2 className="mt-12 text-xl font-semibold">What we store</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Where</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2 pr-4">Retention</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-zinc-900">
                <td className="py-3 pr-4 font-mono text-emerald-400">sybilshield_api_key</td>
                <td className="py-3 pr-4">localStorage</td>
                <td className="py-3 pr-4">Holds your API key so the dashboard can make authed requests on your behalf</td>
                <td className="py-3 pr-4">Until you sign out or clear browser data</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-xl font-semibold">What we do NOT use</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-300">
          <li>· No Google Analytics, Mixpanel, Amplitude, Segment, Heap, or similar</li>
          <li>· No Facebook pixel, Twitter pixel, LinkedIn Insight, TikTok pixel</li>
          <li>· No third-party advertising cookies of any kind</li>
          <li>· No Hotjar, Fullstory, LogRocket, or session replay</li>
          <li>· No cross-site tracking</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold">No banner needed</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Because it&apos;s <strong>strictly necessary</strong> for the dashboard to work,
          GDPR and ePrivacy do not require us to show a consent banner. If you don&apos;t want
          it set, simply don&apos;t sign in.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Removing</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Click <span className="font-mono text-emerald-400">Sign out</span> in the dashboard to
          clear <code className="font-mono text-emerald-400">sybilshield_api_key</code>. Use your
          browser&apos;s &quot;clear site data&quot; for everything.
        </p>

        <p className="mt-12 text-xs italic text-zinc-500">
          Questions?{" "}
          <a href="mailto:support@sybilshield.org" className="text-emerald-400 hover:underline">
            support@sybilshield.org
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
