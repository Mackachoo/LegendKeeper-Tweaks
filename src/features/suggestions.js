// LegendKeeper Tweaks — suggested pages.
//
// Learns from how you move around a project (in this browser only) and suggests the pages you're
// likely to want next from the page you're on. Each tab is a page, so each tab gets its own
// suggestions.
//
// What's recorded, per project, in localStorage ("lkt:usage:<project>"):
//   pages[id] = { n: visits, last: time, dwell: total ms on the page, bounces: quick visits }
//   trans[a][b] = how often you went from page a to page b
// Counts fade with a two-week half-life, so old habits drop away.
//
// How a page scores, for the page you're on (p):
//   - you often go from p to it                        (strongest)
//   - you often come from it to p                      (round trips)
//   - you open it a lot, especially lately
//   - it's p's parent, child or sibling                 (small nudge; bigger if you use it)
//   - pages you open and quickly leave, and rarely come back to, sink
(() => {
  "use strict";
  const LKT = window.__LKT;
  if (!LKT || !LKT.util) return;
  const { projectId, currentResourceId, getResource, allResources, loadJSON, saveJSON } = LKT.util;

  const DAY = 24 * 60 * 60 * 1000;
  const HALF_LIFE = 14 * DAY;
  const BOUNCE_MS = 5000;
  const MAX_PAGES = 400;
  const MAX_LINKS = 24;

  const key = (pid) => `lkt:usage:${pid}`;
  const empty = () => ({ v: 1, t: Date.now(), pages: {}, trans: {} });
  function load(pid) {
    const u = loadJSON(key(pid), null);
    return u && u.v === 1 && u.pages && u.trans ? u : empty();
  }

  // Fade everything by how long it's been since the last fade.
  function decay(u, now) {
    const elapsed = now - (u.t || now);
    if (elapsed < DAY / 4) return;
    const f = Math.pow(0.5, elapsed / HALF_LIFE);
    for (const [id, pg] of Object.entries(u.pages)) {
      pg.n *= f;
      pg.bounces *= f;
      if (pg.n < 0.05) delete u.pages[id];
    }
    for (const [from, tos] of Object.entries(u.trans)) {
      for (const [to, w] of Object.entries(tos)) {
        tos[to] = w * f;
        if (tos[to] < 0.05) delete tos[to];
      }
      if (!Object.keys(tos).length) delete u.trans[from];
    }
    u.t = now;
  }

  function prune(u) {
    const ids = Object.keys(u.pages);
    if (ids.length > MAX_PAGES) {
      ids.sort((a, b) => u.pages[b].n - u.pages[a].n).slice(MAX_PAGES).forEach((id) => delete u.pages[id]);
    }
    for (const tos of Object.values(u.trans)) {
      const entries = Object.entries(tos);
      if (entries.length > MAX_LINKS) {
        entries.sort((a, b) => b[1] - a[1]).slice(MAX_LINKS).forEach(([id]) => delete tos[id]);
      }
    }
  }

  // --- tracking --------------------------------------------------------------------------------
  let here = null; // { pid, id, since }

  function leave(now) {
    if (!here) return;
    const u = load(here.pid);
    const pg = u.pages[here.id];
    if (pg) {
      const stay = now - here.since;
      pg.dwell += Math.min(stay, 30 * 60 * 1000);
      if (stay < BOUNCE_MS) pg.bounces += 1;
      saveJSON(key(here.pid), u);
    }
  }

  function track() {
    const pid = projectId();
    const id = currentResourceId();
    if (!pid || !id || !getResource(id)) return;
    if (here && here.pid === pid && here.id === id) return;
    const now = Date.now();
    const from = here && here.pid === pid ? here.id : null;
    leave(now);

    const u = load(pid);
    decay(u, now);
    const pg = (u.pages[id] ||= { n: 0, last: 0, dwell: 0, bounces: 0 });
    pg.n += 1;
    pg.last = now;
    if (from && from !== id) {
      const tos = (u.trans[from] ||= {});
      tos[id] = (tos[id] || 0) + 1;
    }
    prune(u);
    saveJSON(key(pid), u);
    here = { pid, id, since: now };
    cache = null;
  }
  window.addEventListener("pagehide", () => leave(Date.now()));

  // --- scoring ---------------------------------------------------------------------------------
  let cache = null; // { sig, list }

  function suggestedPages(limit = 12) {
    const pid = projectId();
    if (!pid) return [];
    const p = currentResourceId();
    const sig = `${pid}:${p}`;
    if (cache && cache.sig === sig && Date.now() - cache.at < 5000) return cache.list.slice(0, limit);

    const u = load(pid);
    const now = Date.now();
    const scores = new Map(); // id -> { score, reason, best }
    const add = (id, pts, reason) => {
      if (!id || id === p || pts <= 0) return;
      const s = scores.get(id) || { score: 0, reason: "", best: 0 };
      s.score += pts;
      if (pts > s.best) (s.best = pts), (s.reason = reason);
      scores.set(id, s);
    };
    const nameOf = (id) => getResource(id)?.name || "this page";

    // From here, you usually go to…
    const out = (p && u.trans[p]) || {};
    const outMax = Math.max(1, ...Object.values(out));
    for (const [to, w] of Object.entries(out)) add(to, (4 * w) / outMax, `Often opened after “${nameOf(p)}”`);

    // …and you usually arrive here from…
    if (p) {
      let inMax = 1;
      const ins = [];
      for (const [from, tos] of Object.entries(u.trans)) if (tos[p]) ins.push([from, tos[p]]), (inMax = Math.max(inMax, tos[p]));
      for (const [from, w] of ins) add(from, (1.5 * w) / inMax, `Often opened before “${nameOf(p)}”`);
    }

    // Pages you use a lot, weighted towards lately.
    const freq = (pg) => pg.n * Math.pow(0.5, (now - pg.last) / HALF_LIFE);
    const freqMax = Math.max(1, ...Object.values(u.pages).map(freq));
    for (const [id, pg] of Object.entries(u.pages)) {
      const f = freq(pg);
      add(id, (1.2 * Math.log2(1 + f)) / Math.log2(1 + freqMax), `Opened ${Math.max(1, Math.round(pg.n))} time${Math.round(pg.n) === 1 ? "" : "s"}`);
    }

    // Close by in the tree: parent, children, siblings. A nudge, bigger if you've used them.
    const me = p && getResource(p);
    if (me) {
      const used = (id) => (u.pages[id] ? 1.5 : 1);
      if (me.parentId && getResource(me.parentId)) add(me.parentId, 0.5 * used(me.parentId), `Contains “${me.name}”`);
      const kids = [];
      const sibs = [];
      for (const r of allResources()) {
        if (!r || r.deletedAt || r.id === p) continue;
        if (r.parentId === p) kids.push(r);
        else if (me.parentId && r.parentId === me.parentId) sibs.push(r);
      }
      kids.slice(0, 12).forEach((r) => add(r.id, 0.45 * used(r.id), `Inside “${me.name}”`));
      sibs.slice(0, 12).forEach((r) => add(r.id, 0.3 * used(r.id), `Next to “${me.name}”`));
    }

    // Opened and quickly left, without coming back much: sink it.
    for (const [id, s] of scores) {
      const pg = u.pages[id];
      if (pg && pg.n > 0) s.score *= 1 - 0.6 * Math.min(1, pg.bounces / pg.n);
    }

    const list = [...scores]
      .map(([id, s]) => ({ id, r: getResource(id), score: s.score, reason: s.reason }))
      .filter(({ r }) => r && !r.deletedAt && r.name && r.parentId !== "templates")
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
    cache = { sig, at: now, list };
    return list.slice(0, limit);
  }

  LKT.util.suggestedPages = suggestedPages;
  LKT.clearUsage = () => {
    const pid = projectId();
    if (pid) saveJSON(key(pid), empty());
    cache = null;
  };
  LKT.onRender(track);
})();
