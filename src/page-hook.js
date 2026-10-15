// LegendKeeper Tweaks — page-world script.
//
// Runs at document_start in the page's own JS world so it can intercept LegendKeeper's
// Turbopack chunks before they execute and rewrite a few module factories:
//
//   1. nested-tag-filter: when a tag/name filter is active, LegendKeeper normally flattens the
//      Project Browser tree into an alphabetical list. We rebuild a pruned tree instead, keeping
//      the ancestors needed for nesting and greying them out. (nested-filter-expand keeps your
//      folder open/closed state working while that filter is on.)
//   2. expose-tag-filter: hands us the sidebar's tag-filter state + setter so tag shortcuts can
//      drive it.
//   3. expose-entity-store: hands us LegendKeeper's client-side entity store (read only), used
//      for cover images, tag counts and page names.
//   4. expose-navigate: hands us the sidebar's navigate-to-page function (Recent pages, tabs).
//   5. expose-adapter: hands us LegendKeeper's data adapter, used only by "Apply settings to
//      subpages" to read page tabs and to call the same update functions LegendKeeper's own page
//      menu calls.
//   6. expose-tree-expand: hands us the tree's own Expand all / Collapse all (filter-row buttons).
//
// Everything else is additive DOM/CSS on top of the React app. The only LegendKeeper data we
// ever write is through "Apply settings to subpages", an explicit, confirmed action that uses
// LegendKeeper's own update functions. Otherwise we only drive the Project Browser filter and navigation
// (through LegendKeeper's own functions) and our own localStorage keys (all prefixed "lkt:").
(() => {
  "use strict";
  if (window.__LKT) return;

  const LKT = (window.__LKT = {
    // Set from manifest.json by bridge.js, so there's one place to bump the version.
    get version() {
      return document.documentElement.dataset.lktVersion || null;
    },
    patches: {},
  });
  const log = (...a) => console.info("[LK Tweaks]", ...a);
  const warn = (...a) => console.warn("[LK Tweaks]", ...a);

  // ---------------------------------------------------------------------------------------------
  // Settings (written to <html data-lkt-settings> by bridge.js from chrome.storage)
  // ---------------------------------------------------------------------------------------------
  const DEFAULTS = {
    nestedTagFilter: true,
    tagShortcuts: true,
    tagCounts: true,
    coverIcons: true,
    coverIconsInBody: true,
    coverIconsUseBanner: false,
    recentPages: true,
    slashToFilter: true,
    keepTagFilter: true,
    coverHoverPreview: true,
    coverPrefetch: true,
    readingTime: true,
    tabs: true,
    tabsMiddleClick: true,
    bulkSettings: true,
    recentPlacement: "bottom", // "off" | "filter" | "bottom" | "tabs"
    recentTab: true,
    suggestPlacement: "tabs", // "off" | "filter" | "bottom" | "tabs"
    suggestTab: false,
    blockHandleScale: 1, // multiplier for content block drag handles
    tabsFitWidth: true,
    treeExpandButtons: true,
    tabStyle: "pills",
  };
  function settings() {
    try {
      return { ...DEFAULTS, ...JSON.parse(document.documentElement.dataset.lktSettings || "{}") };
    } catch {
      return DEFAULTS;
    }
  }
  LKT.settings = settings;

  // ---------------------------------------------------------------------------------------------
  // Module patches. Each one is located by a cheap substring gate, then a regex on the minified
  // source. Minified identifiers change between builds, so regexes capture them rather than
  // hard-coding them. If a regex stops matching (LegendKeeper shipped a refactor) the original
  // module runs untouched and we log a warning.
  // ---------------------------------------------------------------------------------------------
  const PATCHES = [
    {
      name: "nested-tag-filter",
      gate: "lk:tree-filter-rule",
      // te=null!==e8,tt=(0,a.useMemo)(()=>{if(!te)return e9;
      re: /(\w+)=null!==(\w+),(\w+)=\(0,(\w+)\.useMemo\)\(\(\)=>\{if\(!\1\)return (\w+);/,
      replace: (m, isFiltering, matches, _tree, _react, baseTree) =>
        m.replace(
          `if(!${isFiltering})`,
          `{const __lkt=window.__LKT&&window.__LKT.nestFilter(${isFiltering}?${matches}:null,${baseTree});if(__lkt)return __lkt;}if(!${isFiltering})`,
        ),
    },
    {
      name: "nested-filter-expand",
      gate: "lk:tree-filter-rule",
      // expandStates:te?void 0:e1 — while filtering LegendKeeper drops your expand state, so every
      // folder is forced open and can't be collapsed. With the nested filter on, keep it.
      re: /expandStates:(\w+)\?void 0:(\w+)/,
      replace: (m, isFiltering, expandStates) =>
        `expandStates:${isFiltering}&&!(window.__LKT&&window.__LKT.nestActive)?void 0:${expandStates}`,
    },
    {
      name: "expose-tag-filter",
      gate: "lk:tree-filter-rule",
      // [Y,Q]=(0,a.useState)([]),[J,Z]=(0,a.useState)("")   (tags, setTags, nameFilter, setNameFilter)
      re: /\[(\w+),(\w+)\]=\(0,(\w+)\.useState\)\(\[\]\),\[(\w+),(\w+)\]=\(0,\3\.useState\)\(""\)/,
      replace: (m, tags, setTags) =>
        `${m},__lktTagBind=window.__LKT&&window.__LKT.bindTagFilter(${tags},${setTags})`,
    },
    {
      name: "expose-entity-store",
      gate: "lk:tree-filter-rule",
      // let n=(0,F.useEntityStore)(),o=(0,N.default)(),l=(0,I.useProjectSubscription)()
      re: /let (\w+)=\(0,\w+\.useEntityStore\)\(\),\w+=\(0,\w+\.default\)\(\),\w+=\(0,\w+\.useProjectSubscription\)\(\)/,
      replace: (m, store) => `${m},__lktStoreBind=window.__LKT&&window.__LKT.bindStore(${store})`,
    },
    {
      name: "expose-navigate",
      gate: "lk:tree-filter-rule",
      // ex=(0,eb.useNavigateInProject)()   — the same function LegendKeeper's shortcut bar uses
      re: /(\w+)=\(0,\w+\.useNavigateInProject\)\(\)/,
      replace: (m, nav) => `${m},__lktNavBind=window.__LKT&&window.__LKT.bindNavigate(${nav})`,
    },
    {
      name: "expose-adapter",
      gate: "lk:tree-filter-rule",
      // key:`wiki-tree-expand-state:${o}`,reducer:E}),e3=(0,z.useAdapterOrNull)()
      re: /(wiki-tree-expand-state:\$\{\w+\}`,reducer:\w+\}\),)(\w+)(=\(0,\w+\.useAdapterOrNull\)\(\))/,
      replace: (m, pre, adapter, post) =>
        `${pre}${adapter}${post},__lktAdapterBind=window.__LKT&&window.__LKT.bindAdapter(${adapter})`,
    },
    {
      name: "expose-tree-expand",
      // In the Project Browser tree: ({...,expandAll:O,collapseAll:P,prefetchChildren:...}) — the same
      // functions as LegendKeeper's own right-click "Expand all" / "Collapse all".
      gate: /expandAll:\w+,collapseAll:\w+,prefetchChildren:/,
      re: /expandAll:(\w+),collapseAll:(\w+),prefetchChildren:/,
      replace: (m, expand, collapse) =>
        `expandAll:(window.__LKT&&window.__LKT.bindTree(${expand},${collapse}),${expand}),collapseAll:${collapse},prefetchChildren:`,
    },
  ];

  function patchFactory(fn) {
    let src;
    try {
      src = Function.prototype.toString.call(fn);
    } catch {
      return fn;
    }
    const relevant = PATCHES.filter((p) => (typeof p.gate === "string" ? src.includes(p.gate) : p.gate.test(src)));
    if (!relevant.length) return fn;

    let out = src;
    for (const p of relevant) {
      if (!p.re.test(out)) {
        LKT.patches[p.name] = "no-match";
        warn(`patch "${p.name}" did not match — LegendKeeper may have changed. Feature disabled.`);
        continue;
      }
      out = out.replace(p.re, p.replace);
      LKT.patches[p.name] = "applied";
    }
    if (out === src) return fn;
    try {
      const patched = (0, eval)(`(${out})`);
      log("patched module:", relevant.map((p) => p.name).join(", "));
      return patched;
    } catch (e) {
      warn("failed to compile patched module, using original", e);
      for (const p of relevant) LKT.patches[p.name] = "compile-error";
      return fn;
    }
  }

  // Chunk format: [script|path, moduleId..., factory, moduleId..., factory, ...]
  function patchChunk(chunk) {
    if (!Array.isArray(chunk)) return;
    for (let i = 1; i < chunk.length; i++) {
      if (typeof chunk[i] === "function") chunk[i] = patchFactory(chunk[i]);
    }
  }

  // Before the runtime boots, TURBOPACK is a plain array that chunks push onto. The runtime then
  // does `let F=globalThis.TURBOPACK; globalThis.TURBOPACK={push:I}; F.forEach(I)`. We wrap both.
  function wrapQueue(arr) {
    arr.forEach(patchChunk);
    const push = arr.push;
    arr.push = function (...chunks) {
      chunks.forEach(patchChunk);
      return push.apply(this, chunks);
    };
    return arr;
  }
  function wrapRuntime(obj) {
    if (!obj || typeof obj.push !== "function" || obj.__lktWrapped) return obj;
    const push = obj.push;
    obj.push = function (...chunks) {
      chunks.forEach(patchChunk);
      return push.apply(this, chunks);
    };
    obj.__lktWrapped = true;
    return obj;
  }
  let turbopack = globalThis.TURBOPACK;
  turbopack = Array.isArray(turbopack) ? wrapQueue(turbopack) : turbopack ? wrapRuntime(turbopack) : wrapQueue([]);
  Object.defineProperty(globalThis, "TURBOPACK", {
    configurable: true,
    get: () => turbopack,
    set: (v) => {
      turbopack = Array.isArray(v) ? wrapQueue(v) : wrapRuntime(v);
    },
  });

  // ---------------------------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------------------------
  let entityStore = null;
  LKT.bindStore = (store) => {
    entityStore = store;
    return 0;
  };
  LKT.store = () => entityStore;

  let adapter = null;
  LKT.bindAdapter = (a) => {
    adapter = a;
    return 0;
  };
  LKT.adapter = () => adapter;

  function getResource(id) {
    try {
      return (entityStore && entityStore.resources && entityStore.resources.get(id)) || null;
    } catch {
      return null;
    }
  }
  function allResources() {
    try {
      return entityStore && entityStore.resources ? [...entityStore.resources.entries()].map((e) => e[1]) : [];
    } catch {
      return [];
    }
  }

  function projectId() {
    const parts = location.pathname.split("/");
    return parts[1] === "a" && parts[2] ? parts[2] : null;
  }
  function currentResourceId() {
    const parts = location.pathname.split("/");
    return parts[1] === "a" && parts[3] ? parts[3] : null;
  }

  function loadJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  // LegendKeeper navigates through its own adapter (not Next's router), so use its function when
  // we have it and fall back to a normal page load otherwise.
  let navigateInProject = null;
  LKT.bindNavigate = (fn) => {
    navigateInProject = fn;
    return 0;
  };
  const glyphClass = (g) => (g && /\bfa-/.test(g) ? g : "fas fa-file-lines");

  function navigateToResource(id) {
    if (typeof navigateInProject === "function") {
      try {
        navigateInProject(id);
        return;
      } catch (e) {
        warn("navigate failed, reloading instead", e);
      }
    }
    location.assign(`/a/${projectId()}/${id}`);
  }

  function flash(msg) {
    let el = document.getElementById("lkt-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "lkt-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("lkt-show");
    clearTimeout(flash.t);
    flash.t = setTimeout(() => el.classList.remove("lkt-show"), 2200);
  }

  const cssString = (s) => `"${String(s).replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ")}"`;

  let styleEls = {};
  function setStyle(id, css) {
    let el = styleEls[id];
    if (!el) el = styleEls[id] = Object.assign(document.createElement("style"), { id: `lkt-${id}` });
    if (!el.isConnected) (document.head || document.documentElement).appendChild(el);
    if (el.textContent !== css) el.textContent = css;
  }

  // ---------------------------------------------------------------------------------------------
  // Feature: tree-preserving tag filter
  // ---------------------------------------------------------------------------------------------
  function setDimmed(ids) {
    const sel = (suffix) =>
      ids.map((id) => `html [data-testid=${cssString(`resource-tree-item-${id}`)}]${suffix}`).join(",\n");
    setStyle("dimmed-ancestors", ids.length ? `${sel("")} { opacity: 0.4; }\n${sel(":hover")} { opacity: 0.75; }` : "");
  }

  // matches: ordered ids that passed LegendKeeper's own name/tag filter, or null when not filtering.
  // base:    LegendKeeper's normal tree ({ rootId, items: { [id]: { id, parentId, children, ... } } }).
  // Returns a replacement tree, or null to let LegendKeeper do its default.
  LKT.nestActive = false;
  LKT.nestFilter = (matches, base) => {
    LKT.nestActive = false;
    if (!matches || !settings().nestedTagFilter || !base || !base.items) {
      setDimmed([]);
      return null;
    }
    LKT.nestActive = true;
    const items = base.items;
    const matched = new Set(matches);
    const keep = new Set();
    for (const id of matches) {
      let cur = id;
      while (cur && cur !== "root" && !keep.has(cur)) {
        keep.add(cur);
        cur = items[cur] && items[cur].parentId;
        if (cur && cur !== "root" && !items[cur]) break; // parent not loaded / not in tree
      }
    }

    const rootChildren = ((items.root && items.root.children) || []).filter((id) => keep.has(id));
    const onRoot = new Set(rootChildren);
    for (const id of keep) {
      const p = items[id] && items[id].parentId;
      if ((!p || p === "root" || !items[p]) && !onRoot.has(id)) {
        rootChildren.push(id);
        onRoot.add(id);
      }
    }

    const out = {};
    const visit = (id) => {
      if (out[id]) return;
      const src = items[id] || { id, children: [], isHidden: false };
      const kids = (src.children || []).filter((k) => keep.has(k));
      // Folders keep whatever open/closed state you had; chevrons work as normal.
      out[id] = { ...src, children: kids, hasChildren: kids.length > 0, isExpanded: kids.length > 0 && !!src.isExpanded };
      kids.forEach(visit);
    };
    rootChildren.forEach(visit);
    out.root = {
      ...(items.root || {}),
      id: "root",
      children: rootChildren,
      isExpanded: true,
      hasChildren: rootChildren.length > 0,
    };

    setDimmed([...keep].filter((id) => !matched.has(id)));
    return { rootId: "root", items: out };
  };

  // ---------------------------------------------------------------------------------------------
  // Feature: tag shortcuts
  // ---------------------------------------------------------------------------------------------
  const tagFilter = { tags: [], set: null };
  const filterKey = () => (projectId() ? `lkt:tag-filter:${projectId()}` : null);
  LKT.bindTagFilter = (tags, setTags) => {
    const changed = tagFilter.tags !== tags;
    const remounted = tagFilter.set !== setTags;
    tagFilter.tags = tags || [];
    tagFilter.set = setTags;
    const key = filterKey();
    if (key && settings().keepTagFilter) {
      if (remounted) {
        // The sidebar just mounted (page load or project switch) with LegendKeeper's empty
        // default: restore the last filter. Deferred so we never set state mid-render.
        const saved = loadJSON(key, []);
        if (!tagFilter.tags.length && Array.isArray(saved) && saved.length) {
          setTimeout(() => tagFilter.set === setTags && setTags(saved), 0);
        }
      } else if (changed) {
        saveJSON(key, tagFilter.tags);
      }
    }
    if (changed) scheduleRender();
    return 0;
  };
  LKT.setTagFilter = (tags) => tagFilter.set && tagFilter.set(tags);

  const TAG_MIME = "application/x-lkt-tag";
  const REORDER_MIME = "application/x-lkt-reorder";
  let draggingTag = null;

  const shortcutsKey = () => (projectId() ? `lkt:tag-shortcuts:${projectId()}` : null);
  function loadShortcuts() {
    const key = shortcutsKey();
    const v = key ? loadJSON(key, []) : [];
    return Array.isArray(v) ? v.filter((t) => typeof t === "string") : [];
  }
  function saveShortcuts(list) {
    const key = shortcutsKey();
    if (!key) return;
    saveJSON(key, list);
    scheduleRender();
  }
  function addShortcut(tag) {
    tag = (tag || "").trim();
    if (!tag) return;
    const list = loadShortcuts();
    if (list.includes(tag)) {
      flash(`"${tag}" is already a tag shortcut`);
      return;
    }
    saveShortcuts([...list, tag]);
  }
  function removeShortcut(tag) {
    saveShortcuts(loadShortcuts().filter((t) => t !== tag));
  }
  function moveShortcut(tag, beforeTag) {
    const list = loadShortcuts().filter((t) => t !== tag);
    const i = beforeTag ? list.indexOf(beforeTag) : -1;
    if (i === -1) list.push(tag);
    else list.splice(i, 0, tag);
    saveShortcuts(list);
  }

  function applyShortcut(tag, additive) {
    if (!tagFilter.set) {
      flash("Open the Project tab in the Project Browser to use tag shortcuts");
      return;
    }
    const cur = tagFilter.tags || [];
    if (additive) {
      tagFilter.set(cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]);
    } else {
      tagFilter.set(cur.length === 1 && cur[0] === tag ? [] : [tag]);
    }
  }

  function tagCounts() {
    const counts = new Map();
    for (const r of allResources()) {
      if (!r || r.deletedAt || r.parentId === "templates") continue;
      for (const t of r.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return counts;
  }

  // --- locating LegendKeeper UI --------------------------------------------------------------
  // LegendKeeper ships `data-insp-path="<source file>:<line>:<col>:<element>"` attributes in
  // production, which gives us far more stable hooks than its utility-class names.
  const SHORTCUTS_AND_TAGS = "ResourceBrowser/ShortcutsAndTags.tsx";

  function findSidebarFilterArea() {
    for (const el of document.querySelectorAll(`[data-insp-path*="${SHORTCUTS_AND_TAGS}"]`)) {
      if (el.classList.contains("flex-col")) return el;
    }
    return null;
  }
  function findFilterInput() {
    const area = findSidebarFilterArea();
    return (area && area.querySelector("input")) || document.querySelector('input[placeholder^="Find by name"]');
  }

  // Marks tag chips that can use native HTML drag (they have no drag behaviour of their own).
  function markTagSources(root) {
    // Active filter pills in the Project Browser: <div class="... rounded-full ..."><span>tag</span><button>×</button></div>
    for (const pill of root.querySelectorAll(`div.rounded-full[data-insp-path*="${SHORTCUTS_AND_TAGS}"]`)) {
      const span = pill.querySelector(":scope > span");
      if (span) mark(pill, span.textContent);
    }
    // Options in the tag filter dropdown (cmdk items).
    for (const item of root.querySelectorAll('[cmdk-item][data-insp-path*="filter-search-input.tsx"]')) {
      const spans = item.querySelectorAll(":scope > span");
      mark(item, spans.length ? spans[spans.length - 1].textContent : item.textContent);
    }
  }
  function mark(el, name) {
    name = (name || "").trim();
    if (!name) return;
    if (el.dataset.lktTag !== name) el.dataset.lktTag = name;
    if (el.getAttribute("draggable") !== "true") el.setAttribute("draggable", "true");
  }

  // Tags on a page are LegendKeeper's own sortable (dnd-kit) chips, so we must not make them
  // natively draggable. Instead we watch the pointer: if a drag that started on a page tag ends
  // over the Project Browser filter area, add a shortcut. LegendKeeper's reordering keeps working.
  function pageTagName(target) {
    const chip = target instanceof Element && target.closest('[data-insp-path*="sortable-tag.tsx"]');
    if (!chip || target.closest("button")) return null;
    const label =
      chip.querySelector('span[data-insp-path*="multi-select.tsx"]') || chip.querySelector("span.text-foreground");
    const text = ((label || chip).textContent || "").replace(/×/g, "").trim();
    return text || null;
  }
  function overFilterArea(x, y) {
    const area = findSidebarFilterArea();
    if (!area) return false;
    const r = area.getBoundingClientRect();
    return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8;
  }

  let pointerDrag = null;
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0 || !settings().tagShortcuts) return;
      const tag = pageTagName(e.target);
      if (tag) pointerDrag = { tag, x: e.clientX, y: e.clientY, active: false };
    },
    true,
  );
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!pointerDrag) return;
      if (!pointerDrag.active && Math.hypot(e.clientX - pointerDrag.x, e.clientY - pointerDrag.y) > 6) {
        pointerDrag.active = true;
        draggingTag = pointerDrag.tag;
        scheduleRender();
      }
      if (pointerDrag.active) {
        findSidebarFilterArea()?.classList.toggle("lkt-drop-target", overFilterArea(e.clientX, e.clientY));
      }
    },
    true,
  );
  const endPointerDrag = (e, commit) => {
    if (!pointerDrag) return;
    const { tag, active } = pointerDrag;
    pointerDrag = null;
    if (!active) return;
    if (commit && overFilterArea(e.clientX, e.clientY)) addShortcut(tag);
    draggingTag = null;
    findSidebarFilterArea()?.classList.remove("lkt-drop-target");
    scheduleRender();
  };
  document.addEventListener("pointerup", (e) => endPointerDrag(e, true), true);
  document.addEventListener("pointercancel", (e) => endPointerDrag(e, false), true);

  // Native HTML drag (sidebar pills, dropdown options, reordering our own shortcuts).
  function inDropArea(target) {
    const area = findSidebarFilterArea();
    return !!(area && target instanceof Node && area.contains(target));
  }
  const isOurDrag = (e) => {
    const types = [...((e.dataTransfer && e.dataTransfer.types) || [])];
    return types.includes(TAG_MIME) || types.includes(REORDER_MIME);
  };

  document.addEventListener(
    "dragstart",
    (e) => {
      if (!settings().tagShortcuts || !(e.target instanceof Element)) return;
      const shortcut = e.target.closest("[data-lkt-shortcut]");
      if (shortcut) {
        e.dataTransfer.setData(REORDER_MIME, shortcut.dataset.lktShortcut);
        e.dataTransfer.effectAllowed = "move";
        return;
      }
      const src = e.target.closest("[data-lkt-tag]");
      if (!src) return;
      const name = src.dataset.lktTag;
      e.dataTransfer.setData(TAG_MIME, name);
      e.dataTransfer.setData("text/plain", name);
      e.dataTransfer.effectAllowed = "copy";
      draggingTag = name;
      scheduleRender();
    },
    true,
  );
  document.addEventListener(
    "dragend",
    () => {
      findSidebarFilterArea()?.classList.remove("lkt-drop-target");
      if (!draggingTag) return;
      draggingTag = null;
      scheduleRender();
    },
    true,
  );
  document.addEventListener(
    "dragover",
    (e) => {
      if (!isOurDrag(e) || !inDropArea(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = [...e.dataTransfer.types].includes(TAG_MIME) ? "copy" : "move";
      findSidebarFilterArea()?.classList.add("lkt-drop-target");
    },
    true,
  );
  document.addEventListener(
    "dragleave",
    (e) => {
      const area = findSidebarFilterArea();
      if (area && !area.contains(e.relatedTarget)) area.classList.remove("lkt-drop-target");
    },
    true,
  );
  document.addEventListener(
    "drop",
    (e) => {
      if (!isOurDrag(e) || !inDropArea(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      findSidebarFilterArea()?.classList.remove("lkt-drop-target");
      const reorder = e.dataTransfer.getData(REORDER_MIME);
      if (reorder) {
        const over = e.target instanceof Element && e.target.closest("[data-lkt-shortcut]");
        moveShortcut(reorder, over ? over.dataset.lktShortcut : null);
        return;
      }
      addShortcut(e.dataTransfer.getData(TAG_MIME));
      draggingTag = null;
      scheduleRender();
    },
    true,
  );

  // ---------------------------------------------------------------------------------------------
  // Feature: recent pages (local history, per project)
  // ---------------------------------------------------------------------------------------------
  const RECENT_MAX = 30;
  const recentKey = () => (projectId() ? `lkt:recent:${projectId()}` : null);
  let lastTracked = null;
  function trackRecent() {
    const key = recentKey();
    const rid = currentResourceId();
    if (!key || !rid || lastTracked === key + rid) return;
    lastTracked = key + rid;
    const list = loadJSON(key, []).filter((id) => id !== rid);
    list.unshift(rid);
    saveJSON(key, list.slice(0, RECENT_MAX));
  }

  // ---------------------------------------------------------------------------------------------
  // Project Browser rows we own (tag shortcuts, recent pages)
  // ---------------------------------------------------------------------------------------------
  const rows = {};
  function ownRow(name, area) {
    let el = rows[name];
    if (!el) {
      el = rows[name] = document.createElement("div");
      el.className = `lkt-row lkt-${name}`;
      el.dataset.lktOwn = "";
      el.addEventListener("click", onRowClick);
    }
    // Keep our rows at the end of the area, in a stable order.
    if (el.parentElement !== area) area.appendChild(el);
    return el;
  }
  function hideRow(name) {
    if (rows[name]) rows[name].remove();
  }
  function setRowContent(row, sig, build) {
    if (row.dataset.sig === sig) return;
    row.dataset.sig = sig;
    row.replaceChildren();
    build(row);
  }

  function renderTagShortcuts(area) {
    const s = settings();
    if (!s.tagShortcuts) {
      setStyle("pinned-pills", "");
      return hideRow("tag-shortcuts");
    }
    const row = ownRow("tag-shortcuts", area);
    const list = loadShortcuts();
    // A pinned tag that's active already shows as selected here, so hide LegendKeeper's duplicate
    // pill for it under the filter box. Pills for other tags stay.
    setStyle(
      "pinned-pills",
      list.length
        ? `${list.map((t) => `div.rounded-full[data-lkt-tag=${cssString(t)}]`).join(",\n")}{display:none!important}`
        : "",
    );
    const active = new Set(tagFilter.tags || []);
    const counts = s.tagCounts ? tagCounts() : null;
    const sig = JSON.stringify([list, [...active], !!draggingTag, counts && list.map((t) => counts.get(t) || 0)]);
    row.hidden = !list.length && !draggingTag;
    row.classList.toggle("lkt-dragging", !!draggingTag);
    setRowContent(row, sig, (row) => {
      if (!list.length && draggingTag) {
        const dz = document.createElement("div");
        dz.className = "content-empty lkt-dropzone";
        dz.textContent = "Drop here to create tag shortcut";
        row.appendChild(dz);
        return;
      }
      for (const tag of list) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "lkt-chip lkt-tag-shortcut" + (active.has(tag) ? " lkt-active" : "");
        b.dataset.lktShortcut = tag;
        b.draggable = true;
        b.title = `Filter by "${tag}"  (Shift/⌘-click to combine, drag to reorder)`;
        const icon = Object.assign(document.createElement("i"), { className: "fas fa-tag" });
        const label = Object.assign(document.createElement("span"), { className: "lkt-label", textContent: tag });
        b.append(icon, label);
        if (counts) {
          b.append(Object.assign(document.createElement("span"), { className: "lkt-count", textContent: counts.get(tag) || 0 }));
        }
        const x = Object.assign(document.createElement("span"), { className: "lkt-remove", textContent: "×", title: "Remove tag shortcut" });
        x.dataset.lktRemove = tag;
        b.append(x);
        row.appendChild(b);
      }
    });
  }

  // Recent pages, newest first, excluding the current page.
  function recentPages(limit = RECENT_MAX) {
    const key = recentKey();
    const current = currentResourceId();
    return (key ? loadJSON(key, []) : [])
      .filter((id) => id !== current)
      .map((id) => ({ id, r: getResource(id) }))
      .filter(({ r }) => r && !r.deletedAt && r.name)
      .slice(0, limit);
  }

  // Recent and Suggested rows. Each goes under the filter box ("filter"), at the bottom of the
  // Project Browser ("bottom"), in the tab bar ("tabs", drawn by features/tabs.js) or nowhere.
  const PAGE_ROWS = {
    recent: { setting: "recentPlacement", label: "Recent", items: () => recentPages(6) },
    suggested: { setting: "suggestPlacement", label: "Suggested", items: () => (LKT.util.suggestedPages ? LKT.util.suggestedPages(6) : []) },
  };
  function placementOf(kind) {
    const s = settings();
    const v = s[PAGE_ROWS[kind].setting];
    if (v === "tabs" && !s.tabs) return "filter";
    return ["off", "filter", "bottom", "tabs"].includes(v) ? v : "filter";
  }
  LKT.placementOf = placementOf;

  function renderPageRow(kind, area) {
    const placement = placementOf(kind);
    if (placement === "off" || placement === "tabs") return hideRow(kind);
    const pid = projectId();
    const items = PAGE_ROWS[kind].items();
    const host = placement === "bottom" ? area.parentElement : area;
    const row = ownRow(kind, host);
    row.classList.toggle("lkt-row-bottom", placement === "bottom");
    row.hidden = !items.length;
    const sig = JSON.stringify(items.map(({ id, r, reason }) => [id, r.name, r.iconGlyph, reason]));
    setRowContent(row, sig, (row) => {
      row.appendChild(Object.assign(document.createElement("span"), { className: "lkt-row-label", textContent: PAGE_ROWS[kind].label }));
      for (const { id, r, reason } of items) {
        const a = document.createElement("a");
        a.className = "lkt-chip lkt-recent-link";
        a.href = `/a/${pid}/${id}`;
        a.title = reason ? `${r.name} — ${reason}` : r.name;
        a.dataset.lktNav = id;
        const icon = document.createElement("i");
        icon.className = "lkt-ic lkt-recent-icon " + glyphClass(r.iconGlyph);
        a.append(icon, Object.assign(document.createElement("span"), { className: "lkt-label", textContent: r.name }));
        row.appendChild(a);
      }
    });
  }

  function onRowClick(e) {
    const rm = e.target.closest("[data-lkt-remove]");
    if (rm) {
      e.preventDefault();
      e.stopPropagation();
      removeShortcut(rm.dataset.lktRemove);
      return;
    }
    const shortcut = e.target.closest("[data-lkt-shortcut]");
    if (shortcut) {
      e.preventDefault();
      applyShortcut(shortcut.dataset.lktShortcut, e.shiftKey || e.metaKey || e.ctrlKey);
      return;
    }
    const nav = e.target.closest("a[data-lkt-nav]");
    if (nav && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      navigateToResource(nav.dataset.lktNav);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Feature: cover image as page icon (Project Browser tree, inline links, backlinks, collection lists)
  //
  // Implemented purely as a generated stylesheet keyed on resource id, so LegendKeeper's DOM —
  // including the rich-text editor — is never modified.
  //
  // LegendKeeper only loads a page's full data (including its images) once the page has been
  // opened, previewed or otherwise subscribed to. We remember cover URLs we've seen per project, so
  // icons persist across sessions for pages you've visited.
  // ---------------------------------------------------------------------------------------------
  const coverKey = () => (projectId() ? `lkt:covers:${projectId()}` : null);
  let coverCache = { key: null, map: {} };

  function imagesOf(r) {
    const img = (r.cover && r.cover.data && r.cover.data.url) || r.imageUrl || "";
    const banner = (r.banner && r.banner.enabled && r.banner.url) || "";
    return [img, banner];
  }

  function refreshCoverCache() {
    const key = coverKey();
    if (!key) return coverCache.map;
    if (coverCache.key !== key) coverCache = { key, map: loadJSON(key, {}) };
    const map = coverCache.map;
    let changed = false;
    for (const r of allResources()) {
      if (!r || !r.id) continue;
      if (r.deletedAt) {
        if (map[r.id]) (delete map[r.id], (changed = true));
        continue;
      }
      // "index" resources haven't loaded their images yet: keep whatever we cached.
      if (!r.hydrationLevel || r.hydrationLevel === "index") continue;
      const [img, banner] = imagesOf(r);
      const prev = map[r.id];
      if (!img && !banner) {
        if (prev) (delete map[r.id], (changed = true));
      } else if (!prev || prev[0] !== img || prev[1] !== banner) {
        map[r.id] = [img, banner];
        changed = true;
      }
    }
    if (changed) saveJSON(key, map);
    return map;
  }

  // Optionally look up covers for pages LegendKeeper hasn't loaded yet, using its own read-only
  // batch loader (the one behind link previews). Once per project per browser session.
  let prefetching = null;
  async function prefetchCovers() {
    const pid = projectId();
    const key = coverKey();
    if (!pid || !key || prefetching === pid || !adapter || typeof adapter.getResourcesByIds !== "function") return;
    const doneKey = `lkt:covers-fetched:${pid}`;
    try {
      if (sessionStorage.getItem(doneKey)) return;
    } catch {}
    const ids = allResources()
      .filter((r) => r && r.id && !r.deletedAt && (!r.hydrationLevel || r.hydrationLevel === "index"))
      .map((r) => r.id);
    if (!ids.length) return;
    prefetching = pid;
    try {
      for (let i = 0; i < ids.length; i += 200) {
        const batch = await adapter.getResourcesByIds(ids.slice(i, i + 200));
        if (projectId() !== pid) return;
        const map = coverCache.key === key ? coverCache.map : (coverCache = { key, map: loadJSON(key, {}) }).map;
        for (const r of batch || []) {
          if (!r || !r.id) continue;
          const [img, banner] = imagesOf(r);
          if (img || banner) map[r.id] = [img, banner];
          else delete map[r.id];
        }
        saveJSON(key, map);
        scheduleRender();
        await new Promise((res) => setTimeout(res, 250));
      }
      try {
        sessionStorage.setItem(doneKey, "1");
      } catch {}
    } catch (e) {
      warn("couldn't load covers", e);
    } finally {
      prefetching = null;
    }
  }

  LKT.coverUrl = (id) => {
    const entry = coverCache.map[id];
    if (!entry || !settings().coverIcons) return null;
    return entry[0] || (settings().coverIconsUseBanner ? entry[1] : "") || null;
  };

  function renderCoverStyles() {
    const s = settings();
    const pid = projectId();
    if (!s.coverIcons || !pid) return setStyle("covers", "");
    const map = refreshCoverCache();
    if (s.coverPrefetch) prefetchCovers();
    const covers = [];
    for (const [id, [img, banner]] of Object.entries(map)) {
      const url = img || (s.coverIconsUseBanner ? banner : "");
      if (url) covers.push([id, url]);
    }
    if (!covers.length) return setStyle("covers", "");

    const links = (id) => [`a[href=${cssString(`/a/${pid}/${id}`)}]`, `a[href^=${cssString(`/a/${pid}/${id}/`)}]`];
    const treeBtn = (id) =>
      `[data-testid=${cssString(`resource-tree-item-${id}`)}] button[aria-label^="Change icon"]`;

    const perId = covers.map(([id, url]) => `${links(id).join(",")}{--lkt-cover:url(${cssString(url)})}`);
    const allLinks = covers.flatMap(([id]) => links(id));
    const allTree = covers.map(([id]) => treeBtn(id));

    let css = perId.join("\n") + "\n";
    // Project Browser tree: the row itself is the <a>, so the variable is already set on it.
    css += `${allTree.join(",\n")}{background-image:var(--lkt-cover);background-size:cover;background-position:center;border-radius:3px;box-shadow:0 0 0 1px rgb(0 0 0/.25)}\n`;
    css += `${allTree.map((t) => `${t}>*`).join(",\n")}{visibility:hidden}\n`;
    if (s.coverIconsInBody) {
      const isLinks = `:is(${allLinks.join(",")})`;
      // Inline @mentions / links inside page text.
      css += `.node-mention ${isLinks}::before{content:"";display:inline-block;width:1.15em;height:1.15em;margin-right:.3em;vertical-align:-.2em;border-radius:3px;background-image:var(--lkt-cover);background-size:cover;background-position:center;box-shadow:0 0 0 1px rgb(0 0 0/.2)}\n`;
      // Rows that lead with LegendKeeper's icon (Backlinks, collection list view, ...).
      css += `${isLinks}>i.inline-flex:first-child{background-image:var(--lkt-cover);background-size:cover;background-position:center;border-radius:3px}\n`;
      css += `${isLinks}>i.inline-flex:first-child>*{visibility:hidden}\n`;
    }
    // Our own links (tabs, recent pages) lead with an <i class="lkt-ic">.
    css += `:is(${allLinks.join(",")})>i.lkt-ic{background-image:var(--lkt-cover);background-size:cover;background-position:center;border-radius:3px;color:transparent!important;opacity:1!important}\n`;
    setStyle("covers", css);
  }

  // ---------------------------------------------------------------------------------------------
  // Feature: Expand all / Collapse all buttons in the Project Browser filter row
  // ---------------------------------------------------------------------------------------------
  const tree = { expand: null, collapse: null };
  LKT.bindTree = (expand, collapse) => {
    tree.expand = expand;
    tree.collapse = collapse;
    return 0;
  };
  let treeButtons = null;
  function renderTreeButtons(area) {
    const box = area && area.querySelector('[data-insp-path*="filter-search-input.tsx"]:has(> input)');
    if (!settings().treeExpandButtons || !box || !tree.expand) {
      treeButtons?.remove();
      return;
    }
    if (!treeButtons) {
      treeButtons = document.createElement("span");
      treeButtons.className = "lkt-tree-buttons";
      treeButtons.dataset.lktOwn = "";
      for (const [icon, label, key] of [
        ["fas fa-angles-down", "Expand all", "expand"],
        ["fas fa-angles-up", "Collapse all", "collapse"],
      ]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "lkt-tree-button";
        b.title = label;
        b.setAttribute("aria-label", label);
        b.append(Object.assign(document.createElement("i"), { className: icon }));
        b.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            tree[key]?.();
          } catch (err) {
            warn(`${label} failed`, err);
          }
        });
        treeButtons.append(b);
      }
    }
    if (treeButtons.parentElement !== box) box.append(treeButtons);
  }

  // ---------------------------------------------------------------------------------------------
  // Feature: press "/" to jump to the Project Browser filter
  // ---------------------------------------------------------------------------------------------
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || !settings().slashToFilter) return;
      const t = e.target;
      if (t instanceof Element && t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return;
      const input = findFilterInput();
      if (!input || !input.offsetParent) return;
      e.preventDefault();
      input.focus();
      input.select();
    },
    true,
  );

  // ---------------------------------------------------------------------------------------------
  // Render loop: keep our additions in sync with React and the entity store
  // ---------------------------------------------------------------------------------------------
  function render() {
    trackRecent();
    const area = findSidebarFilterArea();
    if (area) {
      markTagSources(area);
      renderTagShortcuts(area);
      renderTreeButtons(area);
      renderPageRow("suggested", area);
      renderPageRow("recent", area);
    }
    // Content block handle size: tweaks.css scales LegendKeeper's grip by --lkt-handle-scale.
    // 0.75×–2×; older settings outside that range are clamped.
    const scale = Math.min(2, Math.max(0.75, Number(settings().blockHandleScale) || 1));
    const root = document.documentElement;
    if (scale === 1) {
      if (root.hasAttribute("data-lkt-handle")) root.removeAttribute("data-lkt-handle");
    } else if (root.dataset.lktHandle !== String(scale)) {
      root.dataset.lktHandle = String(scale);
      root.style.setProperty("--lkt-handle-scale", String(scale));
    }
    markTagSources(document);
    renderCoverStyles();
    for (const fn of renderHooks) {
      try {
        fn();
      } catch (e) {
        warn("feature render failed", e);
      }
    }
  }

  let raf = 0;
  function scheduleRender() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      try {
        render();
      } catch (e) {
        warn("render failed", e);
      }
    });
  }
  LKT.render = scheduleRender;

  // Feature files (src/features/*.js) load after this one and register through LKT.
  const renderHooks = [];
  LKT.onRender = (fn) => {
    renderHooks.push(fn);
    scheduleRender();
  };
  LKT.util = {
    settings,
    log,
    warn,
    getResource,
    allResources,
    projectId,
    currentResourceId,
    loadJSON,
    saveJSON,
    navigateToResource,
    flash,
    setStyle,
    cssString,
    glyphClass,
    recentPages,
  };

  const start = () => {
    const ours = (m) => {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      return !!(el && el.closest("[data-lkt-own]"));
    };
    new MutationObserver((muts) => {
      // Ignore mutations inside our own UI.
      if (muts.every(ours)) return;
      scheduleRender();
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("lkt:settings-changed", () => {
      for (const r of Object.values(rows)) delete r.dataset.sig;
      scheduleRender();
    });
    window.addEventListener("popstate", scheduleRender);
    // Store data (covers, tags, names) can change without touching the DOM, so poll lightly.
    setInterval(scheduleRender, 2000);
    scheduleRender();
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
