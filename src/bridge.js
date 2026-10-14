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
    keepTagFilter: true,
    coverHoverPreview: false,
    coverPrefetch: true,
    readingTime: true,
    tabs: true,
    tabsMiddleClick: true,
    bulkSettings: true,
    recentPlacement: "filter",
    recentTab: false,
    suggestPlacement: "filter",
    suggestTab: false,
    blockHandleScale: 1,
    tabsFitWidth: false,
  };

  function publish(settings) {
    document.documentElement.dataset.lktSettings = JSON.stringify({ ...DEFAULTS, ...settings });
    window.dispatchEvent(new CustomEvent("lkt:settings-changed"));
  }

  document.documentElement.dataset.lktVersion = chrome.runtime.getManifest().version;
  // Read everything stored (not just current keys) so old settings can be migrated.
  chrome.storage.sync.get(null, (stored) => {
    const settings = { ...DEFAULTS, ...stored };
    // 0.6.0: the old Recent pages on/off switch became a "Don't show" placement.
    if (settings.recentPages === false) {
      chrome.storage.sync.set({ recentPages: true, recentPlacement: "off" });
      return;
    }
    // 0.7.0: the four named handle sizes became multipliers.
    if (settings.blockHandleSize !== undefined) {
      const scale = { 0: 0.5, 1: 1, 2: 1.5, 3: 1.5 }[settings.blockHandleSize] ?? 1;
      chrome.storage.sync.remove("blockHandleSize", () => chrome.storage.sync.set({ blockHandleScale: scale }));
      return;
    }
    publish(settings);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    chrome.storage.sync.get(DEFAULTS, publish);
  });
})();
