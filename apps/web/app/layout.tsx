import type { Metadata } from "next";
import { jbMono, spaceGrotesk } from "../lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "SybilShield",
  description: "Open-source Sybil detection engine for token distributions",
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
