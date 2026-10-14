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
  blockHandleSize: 1,
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

const inputs = [...document.querySelectorAll("input[data-key], select[data-key]")];

function readInput(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.type === "range") return Number(input.value);
  return input.value; // radio, select
}
function writeInput(input, value) {
  if (input.type === "checkbox") input.checked = !!value;
  else if (input.type === "range") input.value = String(value);
  else if (input.tagName === "SELECT") input.value = value;
  else input.checked = input.value === value;
}

// A feature's options only show while the feature is on; hints show for specific choices.
function syncDependents() {
  for (const subs of document.querySelectorAll(".subs[data-parent]")) {
    subs.hidden = !document.querySelector(`input[data-key="${subs.dataset.parent}"]`).checked;
  }
  for (const hint of document.querySelectorAll("[data-show-when]")) {
    const [key, value] = hint.dataset.showWhen.split("=");
    const control = document.querySelector(`select[data-key="${key}"]`) || document.querySelector(`input[data-key="${key}"]:checked`);
    hint.hidden = control?.value !== value;
  }
}

chrome.storage.sync.get(DEFAULTS, (settings) => {
  for (const input of inputs) {
    writeInput(input, settings[input.dataset.key]);
    input.addEventListener(input.type === "range" ? "input" : "change", () => {
      if (input.type === "radio" && !input.checked) return;
      chrome.storage.sync.set({ [input.dataset.key]: readInput(input) });
      syncDependents();
    });
  }
  syncDependents();
});
