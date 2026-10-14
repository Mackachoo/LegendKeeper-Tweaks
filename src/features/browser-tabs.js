// LegendKeeper Tweaks — extra tabs in the Project Browser, next to Project / Templates / Assets:
//   - Recents: pages you've visited in this project, newest first
//   - Suggested: pages you're likely to want next from the page you're on (features/suggestions.js)
// Each is switched on separately ("Show as a tab" in settings).
//
// LegendKeeper's tabs are Radix tabs we don't control, so we add our own triggers and panels
// alongside them: while one of ours is open, tweaks.css hides LegendKeeper's panels and dims its
// active trigger; clicking any LegendKeeper tab closes ours again.
(() => {
  "use strict";
  const LKT = window.__LKT;
  if (!LKT || !LKT.util) return;
  const { settings, getResource, projectId, recentPages, navigateToResource, glyphClass, saveJSON } = LKT.util;

  const TABS = [
    {
      key: "recents",
      label: "Recents",
      setting: "recentTab",
      heading: "Recently viewed",
      empty: "Pages you open in this project will show up here.",
      items: () => recentPages(30),
      clear: () => saveJSON(`lkt:recent:${projectId()}`, []),
    },
    {
      key: "suggested",
      label: "Suggested",
      setting: "suggestTab",
      heading: "Suggested for this page",
      empty: "Suggestions appear as you use the project: pages you open often, open together, or that sit near this one.",
      items: () => (LKT.util.suggestedPages ? LKT.util.suggestedPages(20) : []),
      clear: () => LKT.clearUsage && LKT.clearUsage(),
      clearLabel: "Reset",
      reasons: true,
    },
  ];
  const state = {}; // key -> { trigger, panel }
  let openKey = null;

  function findTabList() {
    return document.querySelector('[role="tablist"][data-insp-path*="ResourceBrowser/index.tsx"]');
  }

  function setOpen(key) {
    openKey = key;
    for (const t of TABS) {
      const st = state[t.key];
      if (!st) continue;
      const on = t.key === key;
      st.trigger.dataset.state = on ? "active" : "inactive";
      st.trigger.setAttribute("aria-selected", on ? "true" : "false");
      st.panel.hidden = !on;
      if (on) renderPanel(t, true);
    }
  }

  function ensure(t, list) {
    let st = state[t.key];
    if (!st) {
      const sample = list.querySelector('[role="tab"]:not([data-lkt-browser-tab])');
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = `${sample ? sample.className : ""} lkt-browser-trigger`;
      trigger.textContent = t.label;
      trigger.dataset.lktOwn = "";
      trigger.dataset.lktBrowserTab = t.key;
      trigger.setAttribute("role", "tab");
      trigger.addEventListener("click", () => setOpen(t.key));

      const panel = document.createElement("div");
      panel.className = "lkt-browser-panel";
      panel.dataset.lktOwn = "";
      panel.hidden = true;
      panel.addEventListener("click", (e) => onPanelClick(t, e));
      st = state[t.key] = { trigger, panel };
      setOpen(openKey);
    }
    if (st.trigger.parentElement !== list) list.append(st.trigger);
    if (st.panel.parentElement !== list.parentElement) list.after(st.panel);
  }

  function remove(t) {
    const st = state[t.key];
    if (!st) return;
    st.trigger.remove();
    st.panel.remove();
    delete state[t.key];
    if (openKey === t.key) openKey = null;
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

  function renderPanel(t, force) {
    const st = state[t.key];
    if (!st || (openKey !== t.key && !force)) return;
    const pid = projectId();
    const items = t.items();
    const sig = JSON.stringify([pid, items.map(({ id, r, reason }) => [id, r.name, r.iconGlyph, r.parentId, reason])]);
    if (!force && st.panel.dataset.sig === sig) return;
    st.panel.dataset.sig = sig;
    st.panel.replaceChildren();

    const head = document.createElement("div");
    head.className = "lkt-browser-head";
    head.append(Object.assign(document.createElement("span"), { textContent: t.heading }));
    if (items.length) {
      const clear = Object.assign(document.createElement("button"), { type: "button", className: "lkt-browser-clear", textContent: t.clearLabel || "Clear" });
      clear.dataset.lktClear = "";
      head.append(clear);
    }
    st.panel.append(head);

    if (!items.length) {
      st.panel.append(Object.assign(document.createElement("p"), { className: "lkt-browser-empty", textContent: t.empty }));
      return;
    }
    const list = document.createElement("div");
    list.className = "lkt-browser-list";
    for (const { id, r, reason } of items) {
      const a = document.createElement("a");
      a.className = "lkt-browser-item";
      a.href = `/a/${pid}/${id}`;
      a.dataset.lktPage = id;
      const icon = document.createElement("i");
      icon.className = "lkt-ic " + glyphClass(r.iconGlyph);
      if (r.iconColor && !/^#?fff(fff)?$/i.test(r.iconColor)) icon.style.color = r.iconColor;
      const text = document.createElement("span");
      text.className = "lkt-browser-text";
      text.append(Object.assign(document.createElement("span"), { className: "lkt-browser-name", textContent: r.name }));
      const sub = t.reasons && reason ? reason : pathOf(r);
      if (sub) text.append(Object.assign(document.createElement("span"), { className: "lkt-browser-sub", textContent: sub }));
      a.append(icon, text);
      list.append(a);
    }
    st.panel.append(list);
  }

  function onPanelClick(t, e) {
    if (e.target.closest("[data-lkt-clear]")) {
      t.clear();
      renderPanel(t, true);
      return;
    }
    const item = e.target.closest("[data-lkt-page]");
    if (!item || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigateToResource(item.dataset.lktPage);
  }

  // Any of LegendKeeper's own Project Browser tabs closes ours.
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!openKey || !(e.target instanceof Element)) return;
      const tab = e.target.closest('[role="tablist"] [role="tab"], [role="tablist"] [data-insp-path*="TemplatesTabContent"]');
      if (tab && !tab.dataset.lktBrowserTab && tab.closest('[data-insp-path*="ResourceBrowser/index.tsx"]')) setOpen(null);
    },
    true,
  );

  LKT.onRender(() => {
    const list = findTabList();
    for (const t of TABS) {
      if (!settings()[t.setting] || !list) {
        remove(t);
        continue;
      }
      ensure(t, list);
      renderPanel(t, false);
    }
  });
})();
