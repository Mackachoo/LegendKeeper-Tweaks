// LegendKeeper Tweaks — page tabs.
//
// A tab strip along the top of the page content (the Project Browser on the left and the page's
// sidebar on the right keep their full height). It behaves like browser tabs:
//   - navigating normally changes the page in the active tab
//   - opening a page that's already in a tab switches to that tab
//   - middle-click any page link (tree, @mentions, backlinks, ...) to open it in a new tab
//   - right-click a page in the tree → "Open in new tab"
//   - × or middle-click a tab to close it; drag tabs to reorder
//   - optionally, recent pages fill the rest of the bar as faint "suggested" tabs; clicking one
//     opens it as a real tab
// Tabs are saved per project, so they survive reloads.
(() => {
  "use strict";
  const LKT = window.__LKT;
  if (!LKT || !LKT.util) return;
  const { settings, getResource, projectId, currentResourceId, loadJSON, saveJSON, navigateToResource, glyphClass, recentPages } =
    LKT.util;

  const MAX_TABS = 24;
  const key = () => (projectId() ? `lkt:tabs:${projectId()}` : null);

  function load() {
    const k = key();
    const v = k ? loadJSON(k, null) : null;
    return v && Array.isArray(v.ids) ? { ids: v.ids.filter((x) => typeof x === "string"), active: v.active || null } : { ids: [], active: null };
  }
  function save(state) {
    const k = key();
    if (k) saveJSON(k, { ids: state.ids.slice(0, MAX_TABS), active: state.active });
  }

  // Keep the active tab in step with whatever page LegendKeeper is showing.
  let lastSeen = null;
  function syncWithLocation() {
    const rid = currentResourceId();
    const k = key();
    if (!rid || !k || lastSeen === k + rid) return;
    lastSeen = k + rid;
    const state = load();
    if (!state.ids.includes(rid)) {
      const i = state.ids.indexOf(state.active);
      if (i >= 0) state.ids[i] = rid;
      else state.ids.push(rid);
    }
    state.active = rid;
    save(state);
  }

  // Like Chrome: background tabs opened from the same page line up in order after it.
  let lastOpened = { from: null, id: null };
  function openInNewTab(rid) {
    const state = load();
    if (state.ids.includes(rid)) return;
    const after = lastOpened.from === state.active && state.ids.includes(lastOpened.id) ? lastOpened.id : state.active;
    const i = state.ids.indexOf(after);
    state.ids.splice(i >= 0 ? i + 1 : state.ids.length, 0, rid);
    lastOpened = { from: state.active, id: rid };
    if (state.ids.length > MAX_TABS) state.ids = state.ids.slice(0, MAX_TABS);
    save(state);
    LKT.render();
  }
  LKT.openInNewTab = openInNewTab;

  function closeTab(rid) {
    const state = load();
    const i = state.ids.indexOf(rid);
    if (i < 0 || state.ids.length <= 1) return;
    state.ids.splice(i, 1);
    if (state.active === rid) {
      state.active = state.ids[Math.min(i, state.ids.length - 1)];
      save(state);
      navigateToResource(state.active);
    } else {
      save(state);
    }
    LKT.render();
  }

  function moveTab(rid, beforeRid) {
    const state = load();
    state.ids = state.ids.filter((x) => x !== rid);
    const i = beforeRid ? state.ids.indexOf(beforeRid) : -1;
    if (i < 0) state.ids.push(rid);
    else state.ids.splice(i, 0, rid);
    save(state);
    LKT.render();
  }

  // --- the strip -------------------------------------------------------------------------------
  let strip = null;

  // The content area: LegendKeeper's layout column that holds the page view. The strip goes in
  // as its first child; tweaks.css turns that column vertical so the page sits under the strip.
  function findContentHost() {
    const view = document.querySelector(".resource-view-wrapper");
    return view && view.parentElement && view.parentElement.matches('[data-insp-path*="LayoutManager/index.tsx"]')
      ? view.parentElement
      : null;
  }

  // The page's own sidebar is position:fixed over the right of the content area, so keep the
  // tabs clear of it.
  function rightInset() {
    const side = document.querySelector('.resource-view-wrapper [data-insp-path*="components/Sidebar.tsx"].fixed');
    if (!side) return 0;
    const r = side.getBoundingClientRect();
    return r.width > 0 && r.left < window.innerWidth ? Math.max(0, window.innerWidth - r.left) : 0;
  }

  function ensureStrip(host) {
    if (!strip) {
      strip = document.createElement("div");
      strip.className = "lkt-tabs";
      strip.dataset.lktOwn = "";
      strip.setAttribute("role", "tablist");
      strip.addEventListener("click", onClick);
      strip.addEventListener("auxclick", onAuxClick);
      strip.addEventListener("mousedown", (e) => e.button === 1 && e.preventDefault());
      strip.addEventListener("dragstart", onDragStart);
      strip.addEventListener("dragover", onDragOver);
      strip.addEventListener("drop", onDrop);
      strip.addEventListener("dragend", () => strip.querySelectorAll(".lkt-tab-drop").forEach((t) => t.classList.remove("lkt-tab-drop")));
    }
    if (host.firstElementChild !== strip) host.prepend(strip);
    const inset = `${Math.round(rightInset())}px`;
    if (strip.style.getPropertyValue("--lkt-tabs-right") !== inset) strip.style.setProperty("--lkt-tabs-right", inset);
    return strip;
  }

  function removeStrip() {
    if (strip) strip.remove();
  }

  function render() {
    const host = findContentHost();
    if (!settings().tabs || !projectId() || !host) return removeStrip();
    syncWithLocation();
    const el = ensureStrip(host);
    el.classList.toggle("lkt-tabs-fit", !!settings().tabsFitWidth);
    const style = ["filled", "minimal", "underline", "pills"].includes(settings().tabStyle) ? settings().tabStyle : "filled";
    for (const c of [...el.classList]) if (c.startsWith("lkt-tabstyle-") && c !== `lkt-tabstyle-${style}`) el.classList.remove(c);
    el.classList.add(`lkt-tabstyle-${style}`);
    const state = load();
    const pid = projectId();
    const tabs = state.ids.map((id) => ({ id, r: getResource(id) })).filter(({ r }) => r && !r.deletedAt);
    // Suggested, then recent pages, as faint tabs after the open ones (whichever are set to
    // "In tab bar"). Suggestions follow the active tab's page.
    const ghosts = [];
    const seen = new Set(state.ids);
    const addGhosts = (kind, list) => {
      for (const g of list) if (!seen.has(g.id)) seen.add(g.id), ghosts.push({ ...g, kind });
    };
    if (LKT.placementOf?.("suggested") === "tabs" && LKT.util.suggestedPages) addGhosts("suggested", LKT.util.suggestedPages(10));
    if (LKT.placementOf?.("recent") === "tabs") addGhosts("recent", recentPages(12));
    const sig = JSON.stringify([pid, state.active, tabs.map(({ id, r }) => [id, r.name, r.iconGlyph, r.iconColor]), ghosts.map(({ id, r, kind }) => [id, r.name, kind])]);
    if (el.dataset.sig === sig) return;
    el.dataset.sig = sig;
    el.replaceChildren();
    for (const { id, r } of tabs) {
      const a = document.createElement("a");
      a.className = "lkt-tab" + (id === state.active ? " lkt-tab-active" : "");
      a.href = `/a/${pid}/${id}`;
      a.draggable = true;
      a.dataset.lktTab = id;
      a.title = r.name;
      a.setAttribute("role", "tab");
      a.setAttribute("aria-selected", id === state.active ? "true" : "false");
      const icon = document.createElement("i");
      icon.className = "lkt-ic " + glyphClass(r.iconGlyph);
      if (r.iconColor && !/^#?fff(fff)?$/i.test(r.iconColor)) icon.style.color = r.iconColor;
      const label = Object.assign(document.createElement("span"), { className: "lkt-tab-label", textContent: r.name });
      a.append(icon, label);
      if (tabs.length > 1) {
        const x = Object.assign(document.createElement("span"), { className: "lkt-tab-close", textContent: "×", title: "Close tab" });
        x.dataset.lktClose = id;
        a.append(x);
      }
      el.append(a);
    }
    if (ghosts.length) {
      // Recent pages fill the rest of the bar as faint tabs; whatever doesn't fit is clipped.
      const mixed = ghosts.some((g) => g.kind === "suggested") && ghosts.some((g) => g.kind === "recent");
      const wrap = Object.assign(document.createElement("div"), { className: "lkt-ghosts" + (mixed ? " lkt-ghosts-mixed" : "") });
      for (const { id, r, kind, reason } of ghosts) {
        const a = document.createElement("a");
        a.className = `lkt-tab lkt-tab-ghost lkt-ghost-${kind}`;
        a.href = `/a/${pid}/${id}`;
        a.dataset.lktGhost = id;
        a.title = kind === "suggested" ? `${r.name} — suggested${reason ? `: ${reason}` : ""}` : `${r.name} — recent`;
        const icon = document.createElement("i");
        icon.className = "lkt-ic " + glyphClass(r.iconGlyph);
        a.append(icon, Object.assign(document.createElement("span"), { className: "lkt-tab-label", textContent: r.name }));
        wrap.append(a);
      }
      el.append(wrap);
    }
    // Bring the active tab into view by scrolling the strip only. (scrollIntoView would also
    // scroll LegendKeeper's overflow-hidden app container and shift the whole layout.)
    const active = el.querySelector(".lkt-tab-active");
    if (active) {
      const left = active.offsetLeft - el.offsetLeft;
      if (left < el.scrollLeft) el.scrollLeft = left - 8;
      else if (left + active.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = left + active.offsetWidth - el.clientWidth + 8;
    }
  }

  function onClick(e) {
    const close = e.target.closest("[data-lkt-close]");
    if (close) {
      e.preventDefault();
      e.stopPropagation();
      closeTab(close.dataset.lktClose);
      return;
    }
    const ghost = e.target.closest("[data-lkt-ghost]");
    if (ghost && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      // Open the suggestion as a real tab and switch to it.
      e.preventDefault();
      openInNewTab(ghost.dataset.lktGhost);
      navigateToResource(ghost.dataset.lktGhost);
      return;
    }
    const tab = e.target.closest("[data-lkt-tab]");
    if (!tab || e.metaKey || e.ctrlKey || e.shiftKey) return; // let the browser open a real tab
    e.preventDefault();
    if (!tab.classList.contains("lkt-tab-active")) navigateToResource(tab.dataset.lktTab);
  }
  function onAuxClick(e) {
    const ghost = e.button === 1 && e.target.closest("[data-lkt-ghost]");
    if (ghost) {
      e.preventDefault();
      openInNewTab(ghost.dataset.lktGhost);
      return;
    }
    const tab = e.button === 1 && e.target.closest("[data-lkt-tab]");
    if (!tab) return;
    e.preventDefault();
    closeTab(tab.dataset.lktTab);
  }
  function onDragStart(e) {
    const tab = e.target.closest("[data-lkt-tab]");
    if (!tab) return;
    e.dataTransfer.setData("application/x-lkt-tab", tab.dataset.lktTab);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e) {
    if (![...e.dataTransfer.types].includes("application/x-lkt-tab")) return;
    e.preventDefault();
    strip.querySelectorAll(".lkt-tab-drop").forEach((t) => t.classList.remove("lkt-tab-drop"));
    e.target.closest("[data-lkt-tab]")?.classList.add("lkt-tab-drop");
  }
  function onDrop(e) {
    const rid = e.dataTransfer.getData("application/x-lkt-tab");
    if (!rid) return;
    e.preventDefault();
    const over = e.target.closest("[data-lkt-tab]");
    moveTab(rid, over && over.dataset.lktTab !== rid ? over.dataset.lktTab : null);
  }

  // --- middle-click a page link anywhere → new tab ------------------------------------------
  function resourceIdFromLink(a) {
    const pid = projectId();
    const href = a && a.getAttribute("href");
    if (!pid || !href) return null;
    const m = href.match(/^\/a\/([^/?#]+)\/([^/?#]+)/);
    if (!m || m[1] !== pid || ["atlas", "timeline", "settings", "search", "trash", "home"].includes(m[2].toLowerCase())) return null;
    return getResource(m[2]) ? m[2] : null;
  }
  const middleTarget = (e) => {
    if (e.button !== 1 || !settings().tabs || !settings().tabsMiddleClick) return null;
    const a = e.target instanceof Element && e.target.closest("a[href]");
    if (!a || a.closest(".lkt-tabs")) return null;
    return resourceIdFromLink(a);
  };
  // Stop the autoscroll cursor, then open in a LegendKeeper tab instead of a browser tab.
  document.addEventListener("mousedown", (e) => middleTarget(e) && e.preventDefault(), true);
  document.addEventListener(
    "auxclick",
    (e) => {
      const rid = middleTarget(e);
      if (!rid) return;
      e.preventDefault();
      e.stopPropagation();
      openInNewTab(rid);
    },
    true,
  );

  LKT.onRender(render);
})();
