// LegendKeeper Tweaks — a "Recents" tab in the Project Browser, next to Project / Templates /
// Assets (off by default). It lists the pages you've visited in this project, newest first.
//
// LegendKeeper's tabs are Radix tabs we don't control, so this adds its own trigger and panel
// alongside them: while Recents is open, tweaks.css hides LegendKeeper's panels and dims its
// active trigger; clicking any LegendKeeper tab closes Recents again.
(() => {
  "use strict";
  const LKT = window.__LKT;
  if (!LKT || !LKT.util) return;
  const { settings, getResource, projectId, recentPages, navigateToResource, glyphClass, saveJSON } = LKT.util;

  let trigger = null;
  let panel = null;
  let open = false;

  function findTabList() {
    return document.querySelector('[role="tablist"][data-insp-path*="ResourceBrowser/index.tsx"]');
  }

  function setOpen(value) {
    open = value;
    if (trigger) trigger.dataset.state = open ? "active" : "inactive";
    if (trigger) trigger.setAttribute("aria-selected", open ? "true" : "false");
    if (panel) panel.hidden = !open;
    if (open) renderPanel(true);
  }

  function ensure(list) {
    if (!trigger) {
      const sample = list.querySelector('[role="tab"]');
      trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = `${sample ? sample.className : ""} lkt-recents-trigger`;
      trigger.textContent = "Recents";
      trigger.dataset.lktOwn = "";
      trigger.setAttribute("role", "tab");
      trigger.addEventListener("click", () => setOpen(true));

      panel = document.createElement("div");
      panel.className = "lkt-recents-panel";
      panel.dataset.lktOwn = "";
      panel.hidden = true;
      panel.addEventListener("click", onPanelClick);
      setOpen(open);
    }
    if (trigger.parentElement !== list) list.append(trigger);
    if (panel.parentElement !== list.parentElement || panel.previousElementSibling !== list) list.after(panel);
  }

  function remove() {
    trigger?.remove();
    panel?.remove();
    trigger = panel = null;
    open = false;
  }

  function pathOf(r) {
    const names = [];
    let p = r.parentId && getResource(r.parentId);
    for (let i = 0; p && i < 4; i++) {
      names.unshift(p.name);
      p = p.parentId && getResource(p.parentId);
    }
    return names.join(" / ");
  }

  function renderPanel(force) {
    if (!panel || (!open && !force)) return;
    const pid = projectId();
    const items = recentPages(30);
    const sig = JSON.stringify([pid, items.map(({ id, r }) => [id, r.name, r.iconGlyph, r.parentId])]);
    if (!force && panel.dataset.sig === sig) return;
    panel.dataset.sig = sig;
    panel.replaceChildren();

    const head = document.createElement("div");
    head.className = "lkt-recents-head";
    head.append(Object.assign(document.createElement("span"), { textContent: "Recently viewed" }));
    if (items.length) {
      const clear = Object.assign(document.createElement("button"), { type: "button", className: "lkt-recents-clear", textContent: "Clear" });
      clear.dataset.lktClear = "";
      head.append(clear);
    }
    panel.append(head);

    if (!items.length) {
      panel.append(Object.assign(document.createElement("p"), { className: "lkt-recents-empty", textContent: "Pages you open in this project will show up here." }));
      return;
    }
    const list = document.createElement("div");
    list.className = "lkt-recents-list";
    for (const { id, r } of items) {
      const a = document.createElement("a");
      a.className = "lkt-recents-item";
      a.href = `/a/${pid}/${id}`;
      a.dataset.lktRecent = id;
      const icon = document.createElement("i");
      icon.className = "lkt-ic " + glyphClass(r.iconGlyph);
      if (r.iconColor && !/^#?fff(fff)?$/i.test(r.iconColor)) icon.style.color = r.iconColor;
      const text = document.createElement("span");
      text.className = "lkt-recents-text";
      text.append(Object.assign(document.createElement("span"), { className: "lkt-recents-name", textContent: r.name }));
      const path = pathOf(r);
      if (path) text.append(Object.assign(document.createElement("span"), { className: "lkt-recents-path", textContent: path }));
      a.append(icon, text);
      list.append(a);
    }
    panel.append(list);
  }

  function onPanelClick(e) {
    if (e.target.closest("[data-lkt-clear]")) {
      saveJSON(`lkt:recent:${projectId()}`, []);
      renderPanel(true);
      return;
    }
    const item = e.target.closest("[data-lkt-recent]");
    if (!item || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigateToResource(item.dataset.lktRecent);
  }

  // Any of LegendKeeper's own Project Browser tabs closes Recents.
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!open || !(e.target instanceof Element)) return;
      const tab = e.target.closest('[role="tablist"] [role="tab"], [role="tablist"] [data-insp-path*="TemplatesTabContent"]');
      if (tab && tab !== trigger && tab.closest('[data-insp-path*="ResourceBrowser/index.tsx"]')) setOpen(false);
    },
    true,
  );

  LKT.onRender(() => {
    const list = findTabList();
    if (!settings().recentTab || !list) return remove();
    ensure(list);
    renderPanel(false);
  });
})();
