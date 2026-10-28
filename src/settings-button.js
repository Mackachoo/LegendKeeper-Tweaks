// Runs in the extension's isolated world. Adds a LegendKeeper Tweaks button next to "Share" in
// LegendKeeper's top bar, which opens the extension's settings page in a popover.
(() => {
  const EXT_ORIGIN = new URL(chrome.runtime.getURL("")).origin;
  const ICON_URL = chrome.runtime.getURL("icons/icon32.png");
  const NAVBAR = "views/project/components/NavBar/index.tsx";

  let button = null;
  let panel = null;
  let observer = null;

  // After the extension is reloaded or updated, this copy keeps running in already-open tabs but
  // can no longer reach the extension ("Extension context invalidated"). Tidy up and stop.
  function alive() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }
  function retire() {
    observer?.disconnect();
    closePanel();
    button?.remove();
    button = null;
  }

  function findShare() {
    for (const el of document.querySelectorAll(`button[data-insp-path*="${NAVBAR}"]`)) {
      if (el.textContent.trim() === "Share") return el;
    }
    return null;
  }

  let shareClasses = "";
  function ensureButton() {
    const share = findShare();
    if (!share) return;
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.title = "LegendKeeper Tweaks settings";
      button.setAttribute("aria-label", "LegendKeeper Tweaks settings");
      button.setAttribute("aria-haspopup", "dialog");
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        panel ? closePanel() : openPanel();
      });
      const img = Object.assign(document.createElement("img"), { src: ICON_URL, alt: "", width: 18, height: 18 });
      button.append(img);
    }
    // Borrow Share's own classes so the button matches the top bar exactly. While Share's popover
    // is open it swaps its hover classes for a highlighted background, so only copy its resting
    // look (the one with hover styles) and keep the last one otherwise.
    if (/(^|\s)hover:/.test(share.className)) shareClasses = share.className;
    const cls = `${shareClasses || share.className} lkt-settings-button`;
    if (button.className !== cls) button.className = cls;
    if (button.nextElementSibling !== share) share.before(button);
  }

  function theme() {
    return document.body.classList.contains("dark") || document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  }

  // LegendKeeper's own top-bar panels (chat, alerts, members, Share) are side drawers with an ×.
  // Close any that are open so ours takes their place, like they replace each other.
  function closeLegendKeeperPanels() {
    for (const drawer of document.querySelectorAll(".z-drawer")) {
      drawer.querySelector("button svg.lucide-x")?.closest("button")?.click();
    }
  }

  function openPanel() {
    if (!alive()) return retire();
    closeLegendKeeperPanels();
    panel = document.createElement("div");
    panel.className = "lkt-settings-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "LegendKeeper Tweaks settings");
    panel.dataset.theme = theme();
    const frame = document.createElement("iframe");
    frame.src = chrome.runtime.getURL(`popup/popup.html?embedded=1&theme=${theme()}`);
    frame.title = "LegendKeeper Tweaks settings";
    panel.append(frame);
    document.body.append(panel);
    position();
    button.setAttribute("aria-expanded", "true");
    setTimeout(() => document.addEventListener("pointerdown", onOutside, true));
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", position);
  }

  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
    button?.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", position);
  }

  function position() {
    if (!panel || !button) return;
    // Same spot as LegendKeeper's panels: 12px from the right, just under the top bar.
    const top = 56;
    panel.style.top = `${top}px`;
    panel.style.right = "12px";
    panel.style.maxHeight = `${Math.max(200, window.innerHeight - top - 16)}px`;
  }

  const onOutside = (e) => {
    if (!panel?.contains(e.target) && !button?.contains(e.target)) closePanel();
  };
  const onKey = (e) => {
    if (e.key === "Escape") closePanel();
  };

  // The embedded settings page reports its height and asks to close on Escape.
  window.addEventListener("message", (e) => {
    if (e.origin !== EXT_ORIGIN || !e.data || !e.data.lkt) return;
    if (e.data.lkt === "size" && panel) panel.querySelector("iframe").style.height = `${e.data.height}px`;
    if (e.data.lkt === "close") closePanel();
  });

  const start = () => {
    ensureButton();
    let queued = false;
    observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (!alive()) return retire();
        ensureButton();
        if (panel) panel.dataset.theme = theme();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
