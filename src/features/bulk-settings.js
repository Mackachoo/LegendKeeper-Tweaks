// LegendKeeper Tweaks — right-click menu additions for pages in the Project Browser:
//   - "Open in new tab" (when tabs are on)
//   - "Apply settings to subpages…": set page settings on a page and everything under it
//
// Bulk settings are the one place the extension changes world data. It only happens after you
// review the dialog and click Apply, and every change goes through the same LegendKeeper
// functions its own page menu (⋮) uses — one call per page, exactly as if you'd clicked each.
(() => {
  "use strict";
  const LKT = window.__LKT;
  if (!LKT || !LKT.util) return;
  const { settings, getResource, allResources, glyphClass, iconName, warn } = LKT.util;

  const ROW = '[data-testid^="resource-tree-item-"]';
  let menuResourceId = null;

  document.addEventListener(
    "contextmenu",
    (e) => {
      const row = e.target instanceof Element && e.target.closest(ROW);
      menuResourceId = row ? row.dataset.testid.slice("resource-tree-item-".length) : null;
    },
    true,
  );

  // ---------------------------------------------------------------------------------------------
  // Add our items to LegendKeeper's tree context menu
  // ---------------------------------------------------------------------------------------------
  function closeMenu() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  }

  function injectMenuItems() {
    if (!menuResourceId) return;
    const menu = document.querySelector(
      '[data-insp-path*="ContextMenu/index.tsx"] div[data-insp-path*="ResourceTree/ResourceTreeItem.tsx"].w-56',
    );
    if (!menu || menu.querySelector("[data-lkt-menu]")) return;
    const sample = [...menu.children].find((c) => c.classList.contains("rounded-sm") && !c.getAttribute("role"));
    const sep = [...menu.children].find((c) => c.classList.contains("h-px"));
    const rid = menuResourceId;

    const items = [];
    if (settings().tabs && LKT.openInNewTab) {
      items.push(["fas fa-window-restore", "Open in new tab", () => LKT.openInNewTab(rid)]);
    }
    if (settings().bulkSettings) {
      items.push(["fas fa-sliders", "Set for subpages…", () => openDialog(rid)]);
    }
    if (!items.length) return;

    const group = document.createElement("div");
    group.dataset.lktMenu = "";
    group.dataset.lktOwn = "";
    group.append(Object.assign(document.createElement("div"), { className: sep ? sep.className : "lkt-menu-sep" }));
    for (const [icon, label, action] of items) {
      const item = document.createElement("div");
      item.className = (sample ? sample.className : "") + " lkt-menu-item";
      item.setAttribute("role", "menuitem");
      item.tabIndex = -1;
      const i = Object.assign(document.createElement("i"), { className: `${icon} lkt-menu-icon` });
      item.append(i, document.createTextNode(label));
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        action();
      });
      group.append(item);
    }
    menu.append(group);
  }
  LKT.onRender(injectMenuItems);

  // ---------------------------------------------------------------------------------------------
  // Working out which pages are affected
  // ---------------------------------------------------------------------------------------------
  function descendantsOf(rootId) {
    const children = new Map();
    for (const r of allResources()) {
      if (!r || r.deletedAt || !r.parentId) continue;
      if (!children.has(r.parentId)) children.set(r.parentId, []);
      children.get(r.parentId).push(r.id);
    }
    const out = [];
    const seen = new Set([rootId]);
    const stack = [...(children.get(rootId) || [])];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      stack.push(...(children.get(id) || []));
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------------------------
  const TRI = [
    ["", "Leave"],
    ["on", "On"],
    ["off", "Off"],
  ];
  const SETTINGS = [
    { section: "Layout" },
    { key: "fullWidth", label: "Full-width", hint: "Pages and collections" },
    { key: "toc", label: "Table of contents", hint: "Pages" },
    { section: "Access" },
    { key: "locked", label: "Lock", hint: "Prevent editing" },
    { key: "hidden", label: "Hide", hint: "Hidden from players" },
    { section: "Sidebar" },
    { key: "propertyBar", label: "Show property bar" },
    { key: "sidebarFixed", label: "Sidebar scrolling", hint: "Keep the sidebar in place while the page scrolls" },
  ];

  let dialog = null;

  function el(tag, props = {}, ...children) {
    const { dataset, ...rest } = props;
    const e = Object.assign(document.createElement(tag), rest);
    if (dataset) Object.assign(e.dataset, dataset);
    for (const c of children) if (c != null) e.append(c);
    return e;
  }

  function segmented(name, options, value) {
    const wrap = el("div", { className: "lkt-seg", role: "radiogroup" });
    for (const [v, label] of options) {
      const id = `lkt-${name}-${v || "leave"}`;
      const input = el("input", { type: "radio", name: `lkt-${name}`, value: v, id, checked: v === value });
      wrap.append(input, el("label", { htmlFor: id, textContent: label }));
    }
    return wrap;
  }
  const valueOf = (form, name) => form.querySelector(`input[name="lkt-${name}"]:checked`)?.value || "";

  function openDialog(rootId) {
    closeDialog();
    const root = getResource(rootId);
    if (!root) return;
    const subs = descendantsOf(rootId);

    const form = el("form", { className: "lkt-dialog" });
    form.setAttribute("role", "dialog");
    form.setAttribute("aria-modal", "true");
    form.setAttribute("aria-labelledby", "lkt-dialog-title");

    const header = el(
      "div",
      { className: "lkt-dialog-header" },
      el("h2", { id: "lkt-dialog-title", textContent: "Apply settings to subpages" }),
      el("p", {
        className: "lkt-dialog-sub",
        textContent: `“${root.name}” and the ${subs.length} page${subs.length === 1 ? "" : "s"} under it. Settings left on “Leave” aren't touched.`,
      }),
    );

    const includeRoot = el("input", { type: "checkbox", checked: true, id: "lkt-include-root" });
    const scope = el(
      "label",
      { className: "lkt-check", htmlFor: "lkt-include-root" },
      includeRoot,
      el("span", { textContent: `Include “${root.name}” itself` }),
    );

    const body = el("div", { className: "lkt-dialog-body" }, scope);
    for (const s of SETTINGS) {
      if (s.section) {
        body.append(el("h3", { textContent: s.section }));
        continue;
      }
      body.append(
        el(
          "div",
          { className: "lkt-setting" },
          el("div", { className: "lkt-setting-text" }, el("span", { textContent: s.label }), s.hint ? el("small", { textContent: s.hint }) : null),
          segmented(s.key, TRI, ""),
        ),
      );
    }

    // Icon and colour, prefilled from the right-clicked page.
    body.append(el("h3", { textContent: "Icon" }));
    const glyph = el("input", { type: "text", className: "lkt-input", value: iconName(root.iconGlyph) || "file-lines", spellcheck: false });
    const colour = el("input", { type: "color", className: "lkt-colour", value: /^#[0-9a-f]{6}$/i.test(root.iconColor || "") ? root.iconColor : "#ffffff" });
    const preview = el("i", { className: `lkt-icon-preview ${glyphClass(glyph.value)}` });
    const updatePreview = () => {
      preview.className = `lkt-icon-preview ${glyphClass(glyph.value.trim())}`;
      preview.style.color = valueOf(form, "colour") === "set" ? colour.value : "";
    };
    glyph.addEventListener("input", updatePreview);
    colour.addEventListener("input", updatePreview);
    body.append(
      el(
        "div",
        { className: "lkt-setting" },
        el("div", { className: "lkt-setting-text" }, el("span", { textContent: "Icon" }), el("small", { textContent: "Font Awesome name, e.g. dragon or book-open" })),
        segmented("icon", [["", "Leave"], ["set", "Set"]], ""),
      ),
      el("div", { className: "lkt-setting lkt-indent", dataset: { when: "icon" } }, preview, glyph),
      el(
        "div",
        { className: "lkt-setting" },
        el("div", { className: "lkt-setting-text" }, el("span", { textContent: "Icon colour" }), el("small", { textContent: "Shown on map pins and in collection lists" })),
        segmented("colour", [["", "Leave"], ["set", "Set"]], ""),
      ),
      el("div", { className: "lkt-setting lkt-indent", dataset: { when: "colour" } }, colour, el("small", { textContent: "Pick a colour" })),
    );

    const status = el("div", { className: "lkt-dialog-status" });
    const cancel = el("button", { type: "button", className: "lkt-btn", textContent: "Cancel" });
    const apply = el("button", { type: "submit", className: "lkt-btn lkt-btn-primary", textContent: "Apply" });
    const footer = el("div", { className: "lkt-dialog-footer" }, status, cancel, apply);

    form.append(header, body, footer);

    const refresh = () => {
      for (const row of body.querySelectorAll("[data-when]")) row.hidden = valueOf(form, row.dataset.when) !== "set";
      updatePreview();
      const n = subs.length + (includeRoot.checked ? 1 : 0);
      const changes = collectChanges(form, glyph, colour);
      apply.disabled = !Object.keys(changes).length || !n;
      apply.textContent = `Apply to ${n} page${n === 1 ? "" : "s"}`;
    };
    form.addEventListener("change", refresh);
    glyph.addEventListener("input", refresh);
    cancel.addEventListener("click", () => !form.dataset.busy && closeDialog());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const changes = collectChanges(form, glyph, colour);
      const ids = (includeRoot.checked ? [rootId] : []).concat(subs);
      form.dataset.busy = "1";
      for (const c of form.querySelectorAll("input, button")) c.disabled = true;
      try {
        const result = await applyChanges(ids, changes, (done, total) => {
          status.textContent = `Updating… ${done} / ${total}`;
        });
        status.textContent = result.failed
          ? `Done, but ${result.failed} change${result.failed === 1 ? "" : "s"} failed (see console).`
          : `Done — updated ${result.pages} page${result.pages === 1 ? "" : "s"}.`;
        status.classList.toggle("lkt-error", !!result.failed);
      } catch (err) {
        warn("bulk settings failed", err);
        status.textContent = `Couldn't apply: ${err && err.message ? err.message : err}`;
        status.classList.add("lkt-error");
      }
      delete form.dataset.busy;
      cancel.disabled = false;
      cancel.textContent = "Close";
      apply.hidden = true;
    });

    const overlay = el("div", { className: "lkt-overlay" }, form);
    overlay.dataset.lktOwn = "";
    overlay.addEventListener("pointerdown", (e) => e.target === overlay && !form.dataset.busy && closeDialog());
    document.addEventListener("keydown", onKey, true);
    document.body.append(overlay);
    dialog = overlay;
    refresh();
    form.querySelector("input[type=radio]")?.focus();
  }

  function onKey(e) {
    if (e.key === "Escape" && dialog && !dialog.querySelector("form").dataset.busy) {
      e.stopPropagation();
      closeDialog();
    }
  }
  function closeDialog() {
    dialog?.remove();
    dialog = null;
    document.removeEventListener("keydown", onKey, true);
  }

  function collectChanges(form, glyph, colour) {
    const changes = {};
    for (const s of SETTINGS) {
      if (!s.key) continue;
      const v = valueOf(form, s.key);
      if (v) changes[s.key] = v === "on";
    }
    // Stored as a bare name, the way LegendKeeper's own icon picker saves it.
    const name = iconName(glyph.value);
    if (valueOf(form, "icon") === "set" && /^[a-z0-9-]+$/.test(name)) changes.iconGlyph = name;
    if (valueOf(form, "colour") === "set") changes.iconColor = colour.value.toUpperCase();
    return changes;
  }

  // ---------------------------------------------------------------------------------------------
  // Applying — same functions LegendKeeper's page menu calls
  // ---------------------------------------------------------------------------------------------
  const DOC_TYPES = {
    fullWidth: ["page", "collection"],
    toc: ["page"],
    sidebarFixed: ["page", "blank"],
  };

  // Current settings and tabs for every page. Fully loaded pages come from the store; the rest
  // from LegendKeeper's own read-only batch loader (the one it uses for link previews).
  async function detailsFor(adapter, store, ids) {
    const details = new Map();
    const missing = [];
    for (const id of ids) {
      const r = store.resources.get(id);
      const docs = (r?.documentIds || []).map((d) => store.documents.get(d)).filter(Boolean);
      if (r && r.hydrationLevel && r.hydrationLevel !== "index" && docs.length === r.documentIds.length) {
        details.set(id, { ...r, documents: docs });
      } else {
        missing.push(id);
      }
    }
    for (let i = 0; i < missing.length; i += 200) {
      const batch = await adapter.getResourcesByIds(missing.slice(i, i + 200));
      for (const r of batch || []) if (r && r.id) details.set(r.id, { ...r, documents: Array.isArray(r.documents) ? r.documents : [] });
    }
    return details;
  }

  async function applyChanges(ids, changes, onProgress) {
    const adapter = LKT.adapter();
    const store = LKT.store();
    if (!adapter || !store) throw new Error("LegendKeeper isn't ready yet — reload the page and try again.");

    const details = await detailsFor(adapter, store, ids);

    // One task per actual change.
    const tasks = [];
    for (const id of ids) {
      const r = details.get(id) || store.resources.get(id);
      if (!r || r.deletedAt) continue;
      if ("locked" in changes && r.isLocked !== changes.locked) {
        tasks.push([id, () => adapter.updateResourceLocked(id, changes.locked), () => store.updateResource(id, { isLocked: changes.locked })]);
      }
      if ("hidden" in changes && r.isHidden !== changes.hidden) {
        tasks.push([id, () => adapter.updateResourceHidden(id, changes.hidden), () => store.updateResource(id, { isHidden: changes.hidden })]);
      }
      if ("propertyBar" in changes && r.showPropertyBar !== changes.propertyBar) {
        tasks.push([id, () => adapter.updateShowPropertyBar(id, changes.propertyBar), () => store.updateResource(id, { showPropertyBar: changes.propertyBar })]);
      }
      const glyph = changes.iconGlyph && iconName(r.iconGlyph) !== changes.iconGlyph ? changes.iconGlyph : undefined;
      const colour = changes.iconColor && (r.iconColor || "").toUpperCase() !== changes.iconColor ? changes.iconColor : undefined;
      if (glyph || colour) {
        const patch = {};
        if (glyph) patch.iconGlyph = glyph;
        if (colour) patch.iconColor = colour;
        tasks.push([id, () => adapter.updateResourceIcon(id, glyph, colour, undefined), () => store.updateResource(id, patch)]);
      }
      for (const d of r.documents || []) {
        if (!d || d.deletedAt) continue;
        const local = (patch) => () => store.documents.has(d.id) && store.updateDocument(d.id, patch);
        if ("fullWidth" in changes && DOC_TYPES.fullWidth.includes(d.type) && !!d.isFullWidth !== changes.fullWidth) {
          tasks.push([id, () => adapter.updateDocumentFullWidth(id, d.id, changes.fullWidth), local({ isFullWidth: changes.fullWidth })]);
        }
        if ("toc" in changes && DOC_TYPES.toc.includes(d.type) && !!d.tableOfContents !== changes.toc) {
          tasks.push([id, () => adapter.updateDocumentTableOfContents(id, d.id, changes.toc), local({ tableOfContents: changes.toc })]);
        }
        const mode = changes.sidebarFixed ? "fixed" : "default";
        if ("sidebarFixed" in changes && DOC_TYPES.sidebarFixed.includes(d.type) && (d.sidebarMode || "default") !== mode) {
          tasks.push([id, () => adapter.updateDocumentSidebarMode(id, d.id, mode), local({ sidebarMode: mode })]);
        }
      }
    }

    let done = 0;
    let failed = 0;
    const touched = new Set();
    onProgress(0, tasks.length);
    // A few at a time: quick, without flooding LegendKeeper's sync.
    const queue = tasks.slice();
    const worker = async () => {
      while (queue.length) {
        const [id, remote, local] = queue.shift();
        try {
          await remote();
          try {
            local();
          } catch {}
          touched.add(id);
        } catch (e) {
          failed++;
          warn(`failed to update ${id}`, e);
        }
        onProgress(++done, tasks.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    LKT.render();
    return { pages: touched.size, failed };
  }
})();
