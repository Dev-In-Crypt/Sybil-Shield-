import { ImageResponse } from "next/og";

// Next.js file-convention OG image. Renders a real PNG (Twitter/X, Discord,
// LinkedIn, Slack all ignore SVG og:images — that's why the old
// /og-image.svg showed a blank card). Auto-injected into <head> for every
// route as the default og:image + twitter:image.

export const runtime = "edge";
export const alt = "SybilShield — Open-source Sybil detection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(60% 60% at 20% 25%, rgba(192,255,0,0.15), rgba(0,0,0,0) 70%), radial-gradient(50% 50% at 85% 80%, rgba(168,85,247,0.22), rgba(0,0,0,0) 70%), #000000",
          padding: "72px 80px",
          fontFamily: "monospace",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: "3px solid #c0ff00",
              transform: "rotate(45deg)",
              borderRadius: 6,
            }}
          />
          <div
            style={{
              color: "#ffffff",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 6,
            }}
          >
            SYBILSHIELD
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ color: "#ffffff", fontSize: 82, fontWeight: 700, letterSpacing: -2 }}>
            HUNT SYBILS.
          </div>
          <div style={{ color: "#c0ff00", fontSize: 82, fontWeight: 700, letterSpacing: -2 }}>
            PROTECT REAL USERS.
          </div>
        </div>

        {/* Subline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#9aa3b3", fontSize: 28, fontFamily: "sans-serif" }}>
            Open-source Sybil detection for token distributions, DAO voting, and incentive programs.
          </div>
          <div style={{ color: "#9aa3b3", fontSize: 24, fontFamily: "sans-serif" }}>
            Six detection methods · evidence reports · DROP/REVIEW/KEEP verdicts · public appeals.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              background: "#c0ff00",
              color: "#000000",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "10px 22px",
            }}
          >
            sybilshield.org
          </div>
          <div style={{ color: "#6b7280", fontSize: 16, letterSpacing: 2 }}>
            // MIT licensed · public sandbox
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
