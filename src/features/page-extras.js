// LegendKeeper Tweaks — small page extras:
//   - cover preview when hovering a page in the Project Browser (off by default)
//   - reading time at the end of the page title row on longer pages
(() => {
  "use strict";
  const LKT = window.__LKT;
  if (!LKT || !LKT.util) return;
  const { settings, getResource } = LKT.util;

  // ---------------------------------------------------------------------------------------------
  // Cover preview on hover
  // ---------------------------------------------------------------------------------------------
  const ROW = '[data-testid^="resource-tree-item-"]';
  let card = null;
  let hoverTimer = 0;
  let hoverRow = null;

  // LegendKeeper's own crop maths (computeCropLayout, with relaxClamp as the sidebar uses it):
  // where to draw an image of natural size nw×nh in a w×h frame for a given origin and scale.
  function cropLayout(nw, nh, w, h, scale = 1, origin) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
    const k = scale || 1;
    const [ox, oy] = origin && origin.length >= 2 ? origin : [0.5, 0.5];
    let bw, bh;
    if (h / w > nh / nw) (bh = h), (bw = (h / nh) * nw);
    else (bw = w), (bh = (w / nw) * nh);
    const dw = bw * k, dh = bh * k;
    const vw = (1 / k) * Math.min(1, w / h / (nw / nh));
    const vh = (1 / k) * Math.min(1, h / w / (nh / nw));
    return { dw, dh, x: -clamp(ox - vw / 2, -vw, 1) * dw, y: -clamp(oy - vh / 2, -vh, 1) * dh };
  }

  const CARD_W = 220;
  function layoutCard(info) {
    const [frame] = card.children;
    const img = frame.firstElementChild;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return;
    // Same shape as the page's sidebar image frame; fall back to the image's own shape.
    const aspect = Math.min(1.3, Math.max(0.45, info.crop?.a || nh / nw));
    const h = Math.round(CARD_W * aspect);
    frame.style.height = `${h}px`;
    const l = cropLayout(nw, nh, CARD_W, h, info.crop?.s, info.crop?.o);
    Object.assign(img.style, { width: `${l.dw}px`, height: `${l.dh}px`, left: `${l.x}px`, top: `${l.y}px` });
  }

  function showCard(row) {
    const id = row.dataset.testid.slice("resource-tree-item-".length);
    const info = LKT.coverInfo(id);
    if (!info) return;
    if (!card) {
      card = document.createElement("div");
      card.className = "lkt-cover-card";
      card.dataset.lktOwn = "";
      const frame = Object.assign(document.createElement("div"), { className: "lkt-cover-frame" });
      frame.append(document.createElement("img"));
      card.append(frame, document.createElement("div"));
      document.body.append(card);
    }
    const [frame, name] = card.children;
    const img = frame.firstElementChild;
    img.onload = () => layoutCard(info);
    if (img.getAttribute("src") !== info.url) img.src = info.url;
    else layoutCard(info);
    name.textContent = getResource(id)?.name || "";
    const r = row.getBoundingClientRect();
    const top = Math.min(Math.max(8, r.top - 40), window.innerHeight - 330);
    card.style.left = `${Math.round(r.right + 12)}px`;
    card.style.top = `${Math.round(top)}px`;
    card.classList.add("lkt-show");
  }
  function hideCard() {
    clearTimeout(hoverTimer);
    hoverRow = null;
    card?.classList.remove("lkt-show");
  }

  document.addEventListener(
    "mouseover",
    (e) => {
      if (!settings().coverHoverPreview || !settings().coverIcons) return;
      const row = e.target instanceof Element && e.target.closest(ROW);
      if (row === hoverRow) return;
      hideCard();
      if (!row) return;
      hoverRow = row;
      hoverTimer = setTimeout(() => hoverRow === row && row.isConnected && showCard(row), 350);
    },
    true,
  );
  document.addEventListener("pointerdown", hideCard, true);
  document.addEventListener("scroll", hideCard, true);

  // ---------------------------------------------------------------------------------------------
  // Reading time
  // ---------------------------------------------------------------------------------------------
  const WORDS_PER_MINUTE = 230;
  const MIN_WORDS = 300;
  let badge = null;
  let lastCount = 0;

  function mainEditor() {
    for (const pm of document.querySelectorAll(".ProseMirror")) {
      if (pm.closest('[data-insp-path*="EditorView.tsx"]') && !pm.closest('[data-insp-path*="KeyValueRow"]')) return pm;
    }
    return null;
  }

  // Sits at the right end of the page title row, clear of the page menu buttons above it.
  function renderReadingTime() {
    const titleRow = document.querySelector('.resource-view-wrapper [data-insp-path*="ResourceTitle/index.tsx"].resource-title');
    const pm = settings().readingTime ? mainEditor() : null;
    // Counting words is cheap, but don't do it more than once a second.
    const now = Date.now();
    if (pm && now - lastCount < 1000 && badge?.isConnected && badge.parentElement === titleRow) return;
    lastCount = now;
    const words = pm ? (pm.innerText.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length : 0;
    if (!titleRow || words < MIN_WORDS) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "lkt-reading-time";
      badge.dataset.lktOwn = "";
    }
    const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
    const text = `${minutes} min read · ${words.toLocaleString()} words`;
    if (badge.textContent !== text) badge.textContent = text;
    if (badge.parentElement !== titleRow) titleRow.append(badge);
  }

  LKT.onRender(renderReadingTime);
})();
