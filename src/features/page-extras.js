// LegendKeeper Tweaks — small page extras:
//   - cover preview when hovering a page in the sidebar tree (off by default)
//   - reading time next to the breadcrumbs on longer pages
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

  function showCard(row) {
    const id = row.dataset.testid.slice("resource-tree-item-".length);
    const url = LKT.coverUrl(id);
    if (!url) return;
    if (!card) {
      card = document.createElement("div");
      card.className = "lkt-cover-card";
      card.dataset.lktOwn = "";
      card.append(document.createElement("img"), document.createElement("div"));
      document.body.append(card);
    }
    const [img, name] = card.children;
    if (img.getAttribute("src") !== url) img.src = url;
    name.textContent = getResource(id)?.name || "";
    const r = row.getBoundingClientRect();
    const top = Math.min(Math.max(8, r.top - 40), window.innerHeight - 260);
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

  function renderReadingTime() {
    const crumbs = document.querySelector('[data-insp-path*="ResourceBreadcrumbs/index.tsx"]');
    const pm = settings().readingTime ? mainEditor() : null;
    // Counting words is cheap, but don't do it more than once a second.
    const now = Date.now();
    if (pm && now - lastCount < 1000 && badge?.isConnected && badge.parentElement === crumbs) return;
    lastCount = now;
    const words = pm ? (pm.innerText.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length : 0;
    if (!crumbs || words < MIN_WORDS) {
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
    if (badge.parentElement !== crumbs) crumbs.append(badge);
  }

  LKT.onRender(renderReadingTime);
})();
