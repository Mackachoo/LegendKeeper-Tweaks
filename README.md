# LegendKeeper Tweaks

A Chrome extension (Manifest V3) with quality-of-life tweaks for [LegendKeeper](https://www.legendkeeper.com).

## Features

| Tweak | What it does |
| --- | --- |
| **Tag shortcuts** | Drag a tag onto the filter area at the top of the sidebar to pin it. Click a tag shortcut to filter the tree by that tag (click again to clear). Shift/⌘-click combines tags. Drag to reorder, hover → × to remove. Shows how many pages have each tag. Stored per project in `localStorage`. |
| **Keep tree when filtering** | LegendKeeper normally flattens the sidebar into an alphabetical list when you filter by tag or name. This keeps the hierarchy: matching pages show in place, and the parent pages needed to reach them are shown greyed out. |
| **Cover images as page icons** | Replaces a page's icon with a small square crop of its cover image (the image property marked as cover, else the page's primary image; optionally the banner) — in the sidebar tree, in @mention links in page text, and in icon lists such as Backlinks and collection list views. |
| **Recent pages** | The last few pages you opened in this project, as a compact row under the sidebar filter. |
| **Press `/` to filter** | Jumps to the sidebar filter box from anywhere that isn't a text field. |

Tag drag sources: the selected-tag pills under the sidebar filter, the options in the tag filter dropdown, and the tags on a page (drag one over the sidebar filter area and let go — LegendKeeper's own tag reordering still works).

Cover images only exist client-side once LegendKeeper has loaded a page (opened, hovered for a preview, or listed). The extension remembers cover URLs per project, so after you've seen a page once its icon sticks.

Each feature can be switched off in the settings: click the gear-logo button next to **Share** in LegendKeeper's top bar, or the extension's toolbar icon.

## Install (unpacked)

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Reload any open LegendKeeper tabs.

## How it works

LegendKeeper is a Next.js app bundled with Turbopack. `src/page-hook.js` runs at `document_start` in the page's own JS world and wraps `globalThis.TURBOPACK`, so it sees every module factory before it executes. It rewrites the sidebar `ResourceBrowser` module in four small, regex-located places:

- `nested-tag-filter` — before the flat filtered list is built, hand the matches and the full tree to `__LKT.nestFilter`, which returns a pruned tree (matches + ancestors).
- `expose-tag-filter` — passes the sidebar's tag-filter state and setter to the extension, so tag shortcuts can drive the real filter.
- `expose-entity-store` — passes LegendKeeper's client entity store (read only), used for cover images, tag counts and page names.
- `expose-navigate` — passes the sidebar's navigate-to-page function, the same one LegendKeeper's own shortcut bar uses.

Cover icons are a generated stylesheet keyed on page id (`#lkt-covers`), so LegendKeeper's DOM — including the rich-text editor — is never modified for them.

The extension never writes LegendKeeper data. It only drives the sidebar filter and navigation through LegendKeeper's own functions, and stores its own state in `localStorage` keys prefixed `lkt:`.

Everything else is plain DOM work on top of React, located via the `data-insp-path` source annotations LegendKeeper ships in production and the tree's `data-testid="resource-tree-item-<id>"` rows.

`src/bridge.js` runs in the extension's isolated world and mirrors `chrome.storage.sync` settings onto `<html data-lkt-settings>` for the page script. `src/settings-button.js` (also isolated) adds the top-bar button, which opens `popup/popup.html` in an iframe popover themed to match LegendKeeper.

### When LegendKeeper updates

Minified names change on every build, so patches match on structure, not names. If one stops matching, the original module runs untouched, the feature quietly turns off, and the console shows `[LK Tweaks] patch "…" did not match`. Check `window.__LKT.patches` in DevTools for the status of each patch.
