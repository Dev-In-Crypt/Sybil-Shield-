/**
 * SybilShield embeddable score badge (TODO-308 MVP).
 *
 * Intentionally plain ES2017+ JS, no build step, no dependency — this file
 * is served as a static asset and loaded directly by third-party pages, so
 * it must work with a single <script> tag and never break the host page.
 *
 * WHAT THIS IS: a read-only display widget. It shows whatever decision
 * SybilShield's public GET /v1/score/:address already has on record for an
 * address — it does NOT run a fresh analysis and does NOT block anything on
 * the host page itself (no form submission is prevented). An address that
 * has never been part of a SybilShield analysis shows "not yet scored", not
 * a false "clean" result — see the docs page for the full MVP/stretch split
 * (TODO.md TODO-308).
 *
 * Usage:
 *   <span data-sybilshield-address="0x...">
 *   <script src="https://www.sybilshield.org/widget.js" async></script>
 *
 * Optional attributes on the element:
 *   data-sybilshield-api="https://api.example.com"   (self-hosted override)
 *
 * Multiple badges on one page are supported — every element with
 * [data-sybilshield-address] on the page at load time gets its own badge.
 */
(function () {
  "use strict";

  var DEFAULT_API = "https://api.sybilshield.org";

  var STYLE_ID = "sybilshield-widget-style";
  var CSS =
    ".sybilshield-badge{display:inline-flex;align-items:center;gap:6px;" +
    "font:12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
    "padding:3px 8px;border-radius:4px;border:1px solid;white-space:nowrap}" +
    ".sybilshield-badge a{color:inherit;text-decoration:none;opacity:.65;margin-left:2px}" +
    ".sybilshield-badge a:hover{opacity:1;text-decoration:underline}" +
    ".sybilshield-badge--keep{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}" +
    ".sybilshield-badge--review{background:#fffbeb;border-color:#fde68a;color:#92400e}" +
    ".sybilshield-badge--drop{background:#fef2f2;border-color:#fecaca;color:#991b1b}" +
    ".sybilshield-badge--unknown{background:#f4f4f5;border-color:#e4e4e7;color:#52525b}" +
    ".sybilshield-badge--loading{background:#f4f4f5;border-color:#e4e4e7;color:#a1a1aa}";

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function render(el, variant, label) {
    el.className = "sybilshield-badge sybilshield-badge--" + variant;
    el.textContent = "";
    var text = document.createElement("span");
    text.textContent = label;
    el.appendChild(text);
    var link = document.createElement("a");
    link.href = "https://www.sybilshield.org";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = "Sybil-detection score via SybilShield (free, open methodology)";
    link.textContent = "ⓘ";
    el.appendChild(link);
  }

  function classify(score) {
    // Prefer the real decision when present; fall back to the raw score for
    // rows scored before decision/DROP-REVIEW-KEEP was tracked, or scored
    // in cluster_only mode (no per-address decision).
    if (score.decision === "DROP") return { variant: "drop", label: "Sybil risk flagged" };
    if (score.decision === "REVIEW") return { variant: "review", label: "Under review" };
    if (score.decision === "KEEP") return { variant: "keep", label: "Looks clean" };
    if (typeof score.sybil_score === "number") {
      return score.sybil_score >= 70
        ? { variant: "drop", label: "Sybil risk flagged" }
        : { variant: "keep", label: "Looks clean" };
    }
    return { variant: "unknown", label: "Not yet scored" };
  }

  function loadOne(el) {
    var address = el.getAttribute("data-sybilshield-address");
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      render(el, "unknown", "Invalid address");
      return;
    }
    var apiBase = (el.getAttribute("data-sybilshield-api") || DEFAULT_API).replace(/\/$/, "");
    render(el, "loading", "Checking…");

    fetch(apiBase + "/v1/score/" + address)
      .then(function (res) {
        if (res.status === 404) {
          render(el, "unknown", "Not yet scored");
          return null;
        }
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      })
      .then(function (score) {
        if (!score) return; // already handled the 404 case above
        var c = classify(score);
        render(el, c.variant, c.label);
      })
      .catch(function () {
        // Never break the host page on a network hiccup — degrade honestly
        // rather than showing a false "clean" result.
        render(el, "unknown", "Unable to check");
      });
  }

  function init() {
    ensureStyle();
    var els = document.querySelectorAll("[data-sybilshield-address]");
    for (var i = 0; i < els.length; i++) loadOne(els[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
