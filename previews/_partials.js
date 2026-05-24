// Renders shared header/footer/bg into every page.
// Each page just declares: <body data-page="pricing"> for active nav highlighting.

(function(){
  const NAV_ITEMS = [
    ["product", "product-airdrops.html"],
    ["pricing", "pricing.html"],
    ["methods", "methodology.html"],
    ["docs", "docs.html"],
    ["compare", "compare.html"],
    ["trust", "trust.html"],
    ["roadmap", "roadmap.html"],
    ["blog", "blog.html"],
  ];
  const FOOT_PRODUCT = [["pricing","pricing.html"],["calculator","pricing-calculator.html"],["compare","compare.html"],["docs","docs.html"],["roadmap","roadmap.html"],["status","status.html"],["changelog","changelog.html"]];
  const FOOT_PUBLIC = [["methods","methodology.html"],["lookup","lookup.html"],["appeal","appeal.html"],["security","security.html"],["trust","trust.html"]];
  const FOOT_CO = [["about","about.html"],["customers","customers.html"],["blog","blog.html"],["contact","mailto:support@sybilshield.org"]];
  const FOOT_LEGAL = [["privacy","privacy.html"],["terms","terms.html"],["cookies","cookies.html"],["sub-processors","sub-processors.html"]];

  const page = document.body.dataset.page || "";
  const LOGO = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none">
    <path d="M4 6 L16 2 L28 6 V18 L16 30 L4 18 Z" stroke="#c0ff00" stroke-width="2" fill="none"/>
    <path d="M8 14 L16 6 L24 14 L24 22 L16 26 L8 22 Z" stroke="#a855f7" stroke-width="1.5" fill="#c0ff00" fill-opacity=".15"/>
    <circle cx="16" cy="16" r="2" fill="#c0ff00"/>
  </svg>`;

  // <head> injections: favicon, OG, twitter card, theme-color
  if (!document.querySelector('link[rel="icon"]')) {
    const fav = document.createElement("link");
    fav.rel = "icon"; fav.type = "image/svg+xml"; fav.href = "favicon.svg";
    document.head.appendChild(fav);
  }
  const metas = [
    { name: "theme-color", content: "#000000" },
    { name: "description", content: "Open-source Sybil detection for token distributions. Evidence-backed scores in hours, not weeks. Six detection methods, public appeal flow." },
    { property: "og:title", content: document.title || "SybilShield" },
    { property: "og:description", content: "Open-source Sybil detection for token distributions. MIT licensed." },
    { property: "og:image", content: "og-image.svg" },
    { property: "og:type", content: "website" },
    { property: "og:url", content: location.href },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: document.title || "SybilShield" },
    { name: "twitter:description", content: "Hunt Sybils. Protect real users. Open-source detection engine." },
    { name: "twitter:image", content: "og-image.svg" },
  ];
  metas.forEach(m => {
    const k = m.name ? `meta[name="${m.name}"]` : `meta[property="${m.property}"]`;
    if (document.head.querySelector(k)) return;
    const el = document.createElement("meta");
    if (m.name) el.name = m.name; else el.setAttribute("property", m.property);
    el.content = m.content;
    document.head.appendChild(el);
  });

  // background
  const bg = document.createElement("div");
  bg.className = "bg";
  bg.innerHTML = `<div class="orb lime"></div><div class="orb purp"></div><div class="orb pink"></div><div class="grid"></div>`;
  document.body.prepend(bg);

  // sandbox banner
  const sb = document.createElement("div");
  sb.className = "sandbox";
  sb.innerHTML = `<b>// public beta</b> · running on synthetic on-chain data · <a href="roadmap.html">roadmap</a> · <a href="status.html">status</a>`;
  document.body.insertBefore(sb, bg.nextSibling);

  // nav
  const nav = document.createElement("nav");
  nav.className = "top";
  nav.innerHTML = `
    <div class="wrap inner">
      <a class="logo" href="index.html">${LOGO} SYBILSHIELD</a>
      <div class="links" id="nav-links">
        ${NAV_ITEMS.map(([l,h])=>`<a href="${h}" class="${page===l?'active':''}">${l}</a>`).join("")}
        <a href="appeal.html" class="mono-mobile-only" style="display:none">appeal</a>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <a href="appeal.html" class="mono" style="font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#6b7280;display:none" id="nav-appeal">appeal</a>
        <a class="btn" href="dashboard.html">launch</a>
        <button class="hamburger" id="nav-burger" aria-label="Toggle menu" aria-expanded="false"><span></span></button>
      </div>
    </div>`;
  document.body.insertBefore(nav, sb.nextSibling);
  if(window.innerWidth>=768) document.getElementById("nav-appeal").style.display="inline";

  // hamburger toggle
  const burger = document.getElementById("nav-burger");
  const links = document.getElementById("nav-links");
  const mobileAppeal = links.querySelector(".mono-mobile-only");
  burger.addEventListener("click", e => {
    e.stopPropagation();
    const open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    if (mobileAppeal) mobileAppeal.style.display = open ? "block" : "none";
  });
  document.addEventListener("click", e => {
    if (!nav.contains(e.target) && links.classList.contains("open")) {
      links.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      if (mobileAppeal) mobileAppeal.style.display = "none";
    }
  });
  links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    links.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }));

  // footer
  const ft = document.createElement("footer");
  ft.innerHTML = `
    <div class="wrap fgrid">
      <div class="fmain">
        <div class="logo">${LOGO} SYBILSHIELD</div>
        <p>// open-source Sybil-detection engine. MIT licensed.</p>
      </div>
      <div class="col"><h4>/product</h4><ul>${FOOT_PRODUCT.map(([l,h])=>`<li><a href="${h}">${l}</a></li>`).join("")}</ul></div>
      <div class="col"><h4>/public</h4><ul>${FOOT_PUBLIC.map(([l,h])=>`<li><a href="${h}">${l}</a></li>`).join("")}</ul></div>
      <div class="col"><h4>/co</h4><ul>${FOOT_CO.map(([l,h])=>`<li><a href="${h}">${l}</a></li>`).join("")}</ul></div>
      <div class="col"><h4>/legal</h4><ul>${FOOT_LEGAL.map(([l,h])=>`<li><a href="${h}">${l}</a></li>`).join("")}</ul></div>
    </div>
    <div class="wrap legal">// scores are probabilistic // results may contain false positives // appeal flow mandatory</div>`;
  document.body.appendChild(ft);

  // reveal-on-scroll — fire above-the-fold immediately, observe rest
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in")), {threshold:0, rootMargin:"0px"});
  document.querySelectorAll(".reveal").forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
    else io.observe(el);
  });
})();
