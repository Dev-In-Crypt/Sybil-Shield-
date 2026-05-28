import type { Metadata } from "next";
import { jbMono, spaceGrotesk } from "../lib/fonts";
import "./globals.css";

// Match the canonical host the production deploy serves AFTER its redirects.
// Vercel currently 307s sybilshield.org → www.sybilshield.org, so www is the one
// search engines actually see. If we ever flip to apex-canonical, change this here
// AND in apps/web/public/sitemap.xml + robots.txt.
const SITE_URL = "https://www.sybilshield.org";
const DESCRIPTION =
  "Open-source Sybil detection for token distributions, DAO voting, and incentive programs. Score wallets, detect coordinated clusters, and give users a clear appeal path.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SybilShield — Open-source Sybil detection",
    template: "%s · SybilShield",
  },
  description: DESCRIPTION,
  applicationName: "SybilShield",
  authors: [{ name: "SybilShield" }],
  keywords: [
    "sybil detection",
    "airdrop farming",
    "wallet clustering",
    "blockchain analytics",
    "DAO governance",
    "open source",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
  // NOTE: og:image / twitter:image are provided by app/opengraph-image.tsx
  // (next/og generates a real PNG). We intentionally do NOT set `images`
  // here — the old /og-image.svg rendered blank in Twitter/Discord/LinkedIn
  // cards because those platforms ignore SVG og:images.
  openGraph: {
    type: "website",
    siteName: "SybilShield",
    title: "SybilShield — Open-source Sybil detection",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "SybilShield",
    description: DESCRIPTION,
  },
  themeColor: "#000000",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jbMono.variable}`}
    >
      <body className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "var(--font-space)" }}>
        {children}
      </body>
    </html>
  );
}
