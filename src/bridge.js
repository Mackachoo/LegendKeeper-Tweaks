// Runs in the extension's isolated world. Mirrors chrome.storage settings onto
// <html data-lkt-settings="..."> so the page-world script (page-hook.js) can read them.
(() => {
  const DEFAULTS = {
    nestedTagFilter: true,
    tagShortcuts: true,
    tagCounts: true,
    coverIcons: true,
    coverIconsInBody: true,
    coverIconsUseBanner: false,
    recentPages: true,
    slashToFilter: true,
  };

  function publish(settings) {
    document.documentElement.dataset.lktSettings = JSON.stringify({ ...DEFAULTS, ...settings });
    window.dispatchEvent(new CustomEvent("lkt:settings-changed"));
  }

  chrome.storage.sync.get(DEFAULTS, publish);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    chrome.storage.sync.get(DEFAULTS, publish);
  });
})();
