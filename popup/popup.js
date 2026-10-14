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

document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;

// When opened from the button in LegendKeeper's top bar, match LegendKeeper's current theme and
// let the host page size the popover to fit.
const params = new URLSearchParams(location.search);
if (params.get("theme")) document.documentElement.dataset.theme = params.get("theme");
if (params.has("embedded")) {
  document.documentElement.dataset.embedded = "";
  const report = () => parent.postMessage({ lkt: "size", height: document.documentElement.scrollHeight }, "*");
  new ResizeObserver(report).observe(document.body);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") parent.postMessage({ lkt: "close" }, "*");
  });
}

const inputs = [...document.querySelectorAll("input[data-key]")];

// Sub-options only matter while their parent tweak is on.
function syncDependents() {
  for (const row of document.querySelectorAll(".row[data-parent]")) {
    const parentInput = document.querySelector(`input[data-key="${row.dataset.parent}"]`);
    row.classList.toggle("disabled", !parentInput.checked);
  }
}

chrome.storage.sync.get(DEFAULTS, (settings) => {
  for (const input of inputs) {
    input.checked = !!settings[input.dataset.key];
    input.addEventListener("change", () => {
      chrome.storage.sync.set({ [input.dataset.key]: input.checked });
      syncDependents();
    });
  }
  syncDependents();
});
