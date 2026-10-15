# LegendKeeper Tweaks

<img src="../icons/icon128.png" width="96" align="right" alt="LegendKeeper Tweaks logo" />

A Chrome extension that adds quality-of-life tweaks to [LegendKeeper](https://www.legendkeeper.com), the worldbuilding wiki for tabletop games and fiction: page tabs, tag shortcuts, a Project Browser filter that keeps your tree intact, cover images as page icons, bulk page settings, recent pages and more.

It mostly changes how LegendKeeper looks and behaves in your browser. The one exception is **Set for subpages**, which changes page settings in your world, and only after you review and confirm it.

This repo also holds two companion tools for working on LegendKeeper with Claude: an [MCP server](#legendkeeper-mcp-server) and a [Claude skill for the LegendKeeper SDK](#legendkeeper-sdk-skill).

## About this project

I'm a software developer, but this is very much a vibe-coded project. It isn't trying to replace anything in LegendKeeper or be a permanent part of it. It's a collection of tweaks and quality-of-life changes that I find really useful day to day.

Everything here is about usability: making LegendKeeper easier and quicker to get around, and easier to filter. It doesn't add new content or content features. That's deliberate, and it's the rule for what goes in (see [Contributing](#contributing)).

## Features

### Tabs

**Page tabs.** A tab bar along the top of the page content, so you can keep several pages open and switch in one click. The Project Browser on the left keeps its full height, and the page's sidebar on the right sits below the tabs.

- Navigating normally changes the page in the current tab, like a browser.
- **Middle-click** any page link (Project Browser, @mentions, backlinks…) to open it in a new tab, or right-click a page in the tree and choose **Open in new tab**.
- Opening a page that's already in a tab switches to that tab.
- Close a tab with **×** or a middle-click. Drag tabs to reorder them; a bar on each side of the gap shows where it will land.
- **Style**: Pills (default), Filled, Minimal or Underline. In every style the active tab is bold, and suggested and recent pages stay faint.
- Tabs are remembered per project, so they survive a reload.
- **Adaptive width** (on by default): each tab fits its name, up to the standard width; longer names end in "…".
- Optionally, suggested and/or recent pages fill the rest of the bar as faint tabs; click one to open it as a real tab at the end of the bar. Suggestions follow the active tab's page. When both are in the bar, suggestions come first and are marked with a ✦ after the name.

### Pages

**Set for subpages.** Right-click a page in the Project Browser and choose **Set for subpages…** to change settings on that page and everything under it, in one go:

| Group | Settings |
| --- | --- |
| Layout | Full-width, Table of contents |
| Access | Lock, Hide |
| Sidebar | Show property bar, Sidebar scrolling |
| Icon | Icon (Font Awesome name) and icon colour |

Each setting starts on **Leave**; only the ones you switch to On, Off or Set are changed. Pages that already have the value are skipped. Changes go through the same LegendKeeper functions its own page menu (⋮) uses, one page at a time, with progress shown. Permissions are deliberately not included.

**Reading time.** Longer pages (300+ words) show "4 min read · 900 words" at the end of the title row.

**Block handle size.** A slider for the grip you drag content blocks by, from 0.75× to 2× in quarter steps.

### Project Browser

LegendKeeper's left-hand panel (Project / Templates / Assets). "Sidebar" in LegendKeeper means the panel on the right of a page.

**Tag shortcuts.** Pin tags next to LegendKeeper's own shortcuts and filter by them with one click.

- To pin a tag, drag it onto the filter area at the top of the Project Browser. You can drag from:
  - the selected-tag pills under the filter box
  - the options in the tag filter dropdown
  - the tags on a page (drag one over the Project Browser and let go; LegendKeeper's own tag reordering still works)
- Click a pinned tag to filter by it, and click again to clear.
- Shift-click or ⌘-click to combine several tags.
- Drag pinned tags to reorder them. Hover and click **×**, then **Remove?**, to unpin.
- Each pinned tag shows how many pages carry it (can be switched off).
- **Pinned page specific tags** (off by default): each pinned page in LegendKeeper's shortcut bar gets its own pinned tags. Clicking that shortcut switches to its tags; just visiting the page doesn't. With no pinned page selected you get your original pins.
- When a pinned tag is active, LegendKeeper's duplicate tag pill under the filter box is hidden; the pinned tag shows as selected instead.

Pins are saved per project, in this browser only.

**Keep tree when filtering.** If a pinned page is selected in LegendKeeper's shortcut bar, only matches inside it are shown, as in the unfiltered tree. Normally, filtering by tag or name flattens the Project Browser into an alphabetical list. With this on, matching pages stay where they are in the hierarchy. The parent pages needed to reach them are shown greyed out, and you can still click them. Folders keep the open/closed state you had, and you can open and close them as normal while filtering; a greyed-out folder means there are matches inside.

**Keep tag filter after reload.** The tags you've filtered by stay selected when you reload or come back to the project.

**Recent pages** and **Suggested pages.** Each has its own setting for where it appears: don't show, under the filter box, at the bottom of the Project Browser, or in the tab bar as faint tabs. Each can also be shown as its own tab next to Project, Templates and Assets (**Show as a tab**). By default, recent pages show at the bottom of the Project Browser and as a Recents tab, and suggested pages show in the tab bar.

Suggestions are learned from how you use the project, in this browser only, and worked out for the page you're on, so every tab gets its own:

- pages you usually open next from this page score highest, then pages you usually come here from
- pages you open a lot, especially lately
- this page's parent, children and siblings get a small nudge (more if you use them)
- pages you open and quickly leave without coming back sink to the bottom
- everything fades with a two-week half-life, so old habits drop away

Hover a suggestion to see why it's there. The Suggested tab's **Reset** button forgets the learned history for the project.

**Expand / collapse all.** Two buttons beside the filter box open or close every folder in the tree, using LegendKeeper's own Expand all / Collapse all.

**Quick filter key `/`.** Press `/` anywhere outside a text box to jump into the Project Browser's "Find by name or #tag" box, ready to type.

### Cover images

**Covers as page icons.** A page's icon in the Project Browser becomes a small square crop of its cover image. The cover is the image property marked as cover, otherwise the page's main image. Optionally it can fall back to the page banner.

**Also in page content.** The same thumbnails appear before @mention links in page text, in tabs and recent pages, and replace the icon in Backlinks and collection list rows.

**Load covers for all pages.** LegendKeeper only loads a page's images once you've opened it. With this on (the default), the extension looks up covers for the rest using LegendKeeper's own read-only batch loader, the one behind link previews. That's a few requests per project, once per browser session. Covers are remembered per project either way.

**Preview on hover** (on by default). Hover a page in the tree to see a larger version of its cover.

### Settings

Click the gear-logo button next to **Share** in LegendKeeper's top bar (or the extension's toolbar icon). Every tweak can be switched on or off, and settings sync across your Chrome profile.

## Install

The extension isn't on the Chrome Web Store yet, so you load it unpacked:

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this folder (the one containing `manifest.json`).
4. Reload any open LegendKeeper tabs.

To update, pull the latest changes, click the reload icon (↻) on the extension's card in `chrome://extensions`, then reload LegendKeeper.

It works in other Chromium browsers (Edge, Brave, Arc) the same way.

## Privacy and safety

- **Writes only when you confirm.** The only feature that changes world data is **Set for subpages**. It runs only after you review the dialog and click Apply, and only through the same functions LegendKeeper's page menu uses. Nothing else creates, edits or deletes content. The Project Browser filter and page navigation are driven through LegendKeeper's own functions.
- **Read-only lookups.** "Load covers for all pages" and "Set for subpages" read page details through LegendKeeper's own batch loader. The extension doesn't talk to any other server.
- **Local storage only.** Tabs, tag pins, the saved tag filter, recent pages, suggestion history and cached cover URLs are kept in your browser's `localStorage` under keys starting with `lkt:`. Settings go in `chrome.storage.sync`.
- **Fails safe.** If a LegendKeeper update changes the code the extension hooks into, that tweak switches itself off and LegendKeeper carries on normally.

To reset everything for a project, run this in DevTools on a LegendKeeper tab:

```js
Object.keys(localStorage).filter((k) => k.startsWith("lkt:")).forEach((k) => localStorage.removeItem(k));
```

## How it works

LegendKeeper is a Next.js app bundled with Turbopack.

- **Patching the Project Browser.** `src/page-hook.js` runs at `document_start` in the page's own JavaScript context and wraps `globalThis.TURBOPACK`, so it sees every module before it runs. It makes nine small, regex-located edits to the Project Browser's `ResourceBrowser` module:
  - `nested-tag-filter`: before LegendKeeper builds its flat filtered list, hand the matches and the full tree to `__LKT.nestFilter`, which returns a pruned tree (matches plus their ancestors).
  - `nested-filter-expand`: keeps your folder open/closed state (and the chevrons) working while the nested filter is on; LegendKeeper normally drops it while filtering.
  - `nested-filter-drag`: turns the tree's drag-and-drop back on while the nested filter is on, so pages can be moved between folders; LegendKeeper switches it off while filtering, which made drops there misbehave.
  - `expose-root`: passes the page the shortcut bar has narrowed the tree to, for per-page tag pins.
  - `expose-tag-filter`: passes the Project Browser's tag-filter state and setter to the extension, so tag shortcuts drive the real filter.
  - `expose-entity-store`: passes LegendKeeper's client-side data store (read only), used for cover images, tag counts and page names.
  - `expose-navigate`: passes the Project Browser's navigate-to-page function, the same one LegendKeeper's shortcut bar uses (Recent pages, tabs).
  - `expose-tree-expand`: passes the tree's own Expand all / Collapse all functions, for the filter-row buttons.
  - `expose-adapter`: passes LegendKeeper's data adapter, used to look up covers and page details, and by Set for subpages to call LegendKeeper's own update functions.
- **Cover icons** are a generated stylesheet keyed on page ID (`<style id="lkt-covers">`). LegendKeeper's DOM, including the rich-text editor, is never modified for them.
- **Everything else** is added on top of React. It finds LegendKeeper's elements through the `data-insp-path` source annotations LegendKeeper ships in production and the tree's `data-testid="resource-tree-item-<id>"` rows.
- **`src/features/`** holds the larger features (`suggestions.js`, `tabs.js`, `bulk-settings.js`, `page-extras.js`, `browser-tabs.js`). They load after `page-hook.js` and plug into it through `window.__LKT.util` and `__LKT.onRender()`.
- **`src/bridge.js`** runs in the extension's isolated world and copies settings from `chrome.storage.sync` onto `<html data-lkt-settings>` for the page script.
- **`src/settings-button.js`** adds the top-bar button, which opens `popup/popup.html` in a popover themed to match LegendKeeper.

### When LegendKeeper updates

Minified names change with every LegendKeeper release, so the patches match on code structure rather than names. If one stops matching:

- the original module runs untouched
- that feature quietly turns off
- the console shows `[LK Tweaks] patch "…" did not match`

Run `window.__LKT.patches` in DevTools to see the status of each patch (`applied`, `no-match` or `compile-error`).

## Repository layout

```
manifest.json                 Chrome extension manifest (MV3)
src/
  page-hook.js                Page-world script: Turbopack patches, core tweaks, shared helpers
  features/
    tabs.js                   Page tabs
    bulk-settings.js          Right-click menu items and the Set for subpages dialog
    page-extras.js            Cover hover preview, reading time
    suggestions.js            Suggested pages: usage tracking and scoring
    browser-tabs.js           Recents / Suggested tabs in the Project Browser
  bridge.js                   Isolated world: settings bridge
  settings-button.js          Isolated world: top-bar settings button and popover
  tweaks.css                  Styles for injected UI
popup/                        Settings page (toolbar popup and top-bar popover)
icons/                        Logo (icon.svg) and PNG sizes
.github/                      This README, the license and GitHub workflows
.claude/
  mcp/legendkeeper-mcp/       MCP server for LegendKeeper (see below)
  skills/legendkeeper-sdk/    Claude skill for the LegendKeeper API and SDK
```

## LegendKeeper MCP server

`.claude/mcp/legendkeeper-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude read and edit your LegendKeeper worlds through the official v3 API. Claude can browse, search, read and write pages in Markdown, set infobox facts, add map pins and timeline events, and upload images.

```sh
cd .claude/mcp/legendkeeper-mcp
npm install
npm run build
claude mcp add legendkeeper -e LEGENDKEEPER_KEY_OOO=lk_... -- node "$PWD/dist/index.js"
```

You need an API key per world: **Project Settings → Developers → API Keys** (requires a paid plan). Never commit keys. Keep them in your MCP client's config or in a local `.env`, which is git-ignored. See [`.claude/mcp/legendkeeper-mcp/README.md`](../.claude/mcp/legendkeeper-mcp/README.md) for all options, including Claude desktop setup, Docker, multiple worlds and read-only mode.

## LegendKeeper SDK skill

`.claude/skills/legendkeeper-sdk` is a Claude skill covering LegendKeeper's v3 REST API and the `@legendkeeper/sdk` TypeScript client: operations, schemas, a style guide and 40+ runnable examples. Claude Code picks it up automatically when working in this repo. To use it everywhere, copy the folder to `~/.claude/skills/`.

## Development

There is no build step. Edit the files, reload the extension in `chrome://extensions`, then reload LegendKeeper.

Useful while working on it:

- `window.__LKT.patches`: patch status.
- `window.__LKT.store()`: LegendKeeper's entity store (for example `__LKT.store().resources.get(id)`).
- `window.__LKT.render()`: force a re-sync of the injected UI.

## Contributing

Issues and pull requests are very welcome, whether that's a bug, a fix, or an idea for a new tweak.

The one rule: **changes should be quality-of-life and usability only, not new content.** Things like navigation, filtering, layout, shortcuts and speed-ups are in scope. New block types, new kinds of page content, or anything that stores extra data inside pages is out.

That's because of how LegendKeeper is used. Projects are often shared by lots of people, and everything this extension does only changes things for you, in your browser; nobody else in the project is affected. New content would break that. If the extension added its own blocks or markup to pages, everyone without it would see odd or broken content. So, as a rule, those don't go in.

When you open a pull request:

- Keep LegendKeeper working if your change stops matching. Patches should fail safe the way the existing ones do (see [How it works](#how-it-works)).
- Add a setting for anything that changes how LegendKeeper looks or behaves, so people can turn it off.
- Bump the version in `manifest.json`.

## Disclaimer

LegendKeeper Tweaks is an unofficial, personal project. It is not affiliated with or endorsed by LegendKeeper. The LK mark in the icon belongs to LegendKeeper.

## License

[MIT](LICENSE)
