import { ImageResponse } from "next/og";

// Next.js file-convention OG image — renders a real 1200x630 PNG.
// Twitter/X, Discord, LinkedIn, Slack all ignore SVG og:images, which is
// why the old /og-image.svg produced a blank card.
//
// IMPORTANT: the rendering engine (Satori) supports only a subset of CSS.
// Multiple comma-separated radial-gradients and custom fontFamily names
// make it throw (→ 0-byte response). Keep styles simple: solid colours,
// single gradients, no fontFamily (uses the built-in default font).

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
          backgroundColor: "#000000",
          backgroundImage:
            "linear-gradient(135deg, rgba(192,255,0,0.12) 0%, rgba(0,0,0,0) 45%, rgba(168,85,247,0.18) 100%)",
          padding: "72px 80px",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #c0ff00",
              borderRadius: 6,
              marginRight: 20,
            }}
          />
          <div style={{ color: "#ffffff", fontSize: 28, fontWeight: 700, letterSpacing: 6 }}>
            SYBILSHIELD
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#ffffff", fontSize: 84, fontWeight: 800 }}>HUNT SYBILS.</div>
          <div style={{ color: "#c0ff00", fontSize: 84, fontWeight: 800 }}>PROTECT REAL USERS.</div>
        </div>

        {/* Subline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#9aa3b3", fontSize: 28 }}>
            Open-source Sybil detection for token distributions, DAO voting, incentive programs.
          </div>
          <div style={{ color: "#9aa3b3", fontSize: 24, marginTop: 8 }}>
            Six methods · evidence reports · DROP / REVIEW / KEEP verdicts · public appeals.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              backgroundColor: "#c0ff00",
              color: "#000000",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "10px 22px",
              marginRight: 20,
            }}
          >
            sybilshield.org
          </div>
          <div style={{ color: "#6b7280", fontSize: 16, letterSpacing: 2 }}>
            MIT licensed · public sandbox
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
