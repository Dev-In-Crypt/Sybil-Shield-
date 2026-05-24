import type { Metadata } from "next";
import { jbMono, spaceGrotesk } from "../lib/fonts";
import "./globals.css";

const SITE_URL = "https://sybilshield.org";
const DESCRIPTION =
  "Open-source Sybil detection for airdrops, DAO governance, and DeFi farming. Six methods, evidence per address, public appeal flow.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SybilShield — Hunt Sybils. Protect real users.",
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
  openGraph: {
    type: "website",
    siteName: "SybilShield",
    title: "SybilShield — Hunt Sybils. Protect real users.",
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "SybilShield" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SybilShield",
    description: DESCRIPTION,
    images: ["/og-image.svg"],
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
