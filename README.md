# LegendKeeper Tweaks

<img src="icons/icon128.png" width="96" align="right" alt="LegendKeeper Tweaks logo" />

A Chrome extension that adds quality-of-life tweaks to [LegendKeeper](https://www.legendkeeper.com), the worldbuilding wiki for tabletop games and fiction: tag shortcuts, a sidebar filter that keeps your tree intact, cover images as page icons, recent pages and a quick-filter key.

It only changes how LegendKeeper looks and behaves in your browser. It never writes to your worlds.

This repo also holds two companion tools for working on LegendKeeper with Claude: an [MCP server](#legendkeeper-mcp-server) and a [Claude skill for the LegendKeeper SDK](#legendkeeper-sdk-skill).

## Features

### Sidebar

**Tag shortcuts.** Pin tags next to LegendKeeper's own shortcuts and filter by them with one click.

- To pin a tag, drag it onto the filter area at the top of the sidebar. You can drag from:
  - the selected-tag pills under the filter box
  - the options in the tag filter dropdown
  - the tags on a page (drag one over the sidebar and let go; LegendKeeper's own tag reordering still works)
- Click a pinned tag to filter by it, and click again to clear.
- Shift-click or ⌘-click to combine several tags.
- Drag pinned tags to reorder them. Hover and click **×** to unpin.
- Each pinned tag shows how many pages carry it (can be switched off).

Pins are saved per project, in this browser only.

**Keep tree when filtering.** Normally, filtering by tag or name flattens the sidebar into an alphabetical list. With this on, matching pages stay where they are in the hierarchy. The parent pages needed to reach them are shown greyed out, and you can still click them.

**Recent pages.** The last few pages you opened in this project, as a compact row under the filter box. Clicking one switches page instantly, the same way LegendKeeper's own links do.

**Quick filter key `/`.** Press `/` anywhere outside a text box to jump into the sidebar's "Find by name or #tag" box, ready to type.

### Cover images

**Covers as page icons.** A page's icon in the sidebar tree becomes a small square crop of its cover image. The cover is the image property marked as cover, otherwise the page's main image. Optionally it can fall back to the page banner.

**Also in page content.** The same thumbnails appear before @mention links in page text, and replace the icon in Backlinks and collection list rows.

LegendKeeper only loads a page's images once you've opened it or hovered it for a preview. The extension remembers the covers it has seen for each project, so once you've visited a page its icon stays.

### Settings

Click the gear-logo button next to **Share** in LegendKeeper's top bar (or the extension's toolbar icon). Every tweak can be switched on or off, and settings sync across your Chrome profile.

## Install

The extension isn't on the Chrome Web Store, so you load it unpacked:

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this folder (the one containing `manifest.json`).
4. Reload any open LegendKeeper tabs.

To update, pull the latest changes, click the reload icon (↻) on the extension's card in `chrome://extensions`, then reload LegendKeeper.

It works in other Chromium browsers (Edge, Brave, Arc) the same way.

## Privacy and safety

- **No writes to your worlds.** The extension never creates, edits or deletes LegendKeeper content. Where it drives the app (the sidebar filter, page navigation), it calls LegendKeeper's own functions.
- **No network requests of its own.** Cover thumbnails reuse the image URLs LegendKeeper already loads.
- **Local storage only.** Tag pins, recent pages and cached cover URLs are kept in your browser's `localStorage` under keys starting with `lkt:`. Settings go in `chrome.storage.sync`.
- **Fails safe.** If a LegendKeeper update changes the code the extension hooks into, that tweak switches itself off and LegendKeeper carries on normally.

To reset everything for a project, run this in DevTools on a LegendKeeper tab:

```js
Object.keys(localStorage).filter((k) => k.startsWith("lkt:")).forEach((k) => localStorage.removeItem(k));
```

## How it works

LegendKeeper is a Next.js app bundled with Turbopack.

- **Patching the sidebar.** `src/page-hook.js` runs at `document_start` in the page's own JavaScript context and wraps `globalThis.TURBOPACK`, so it sees every module before it runs. It makes four small, regex-located edits to the sidebar's `ResourceBrowser` module:
  - `nested-tag-filter`: before LegendKeeper builds its flat filtered list, hand the matches and the full tree to `__LKT.nestFilter`, which returns a pruned tree (matches plus their ancestors).
  - `expose-tag-filter`: passes the sidebar's tag-filter state and setter to the extension, so tag shortcuts drive the real filter.
  - `expose-entity-store`: passes LegendKeeper's client-side data store (read only), used for cover images, tag counts and page names.
  - `expose-navigate`: passes the sidebar's navigate-to-page function, the same one LegendKeeper's shortcut bar uses.
- **Cover icons** are a generated stylesheet keyed on page ID (`<style id="lkt-covers">`). LegendKeeper's DOM, including the rich-text editor, is never modified for them.
- **Everything else** is added on top of React. It finds LegendKeeper's elements through the `data-insp-path` source annotations LegendKeeper ships in production and the tree's `data-testid="resource-tree-item-<id>"` rows.
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
  page-hook.js                Page-world script: Turbopack patches and all tweaks
  bridge.js                   Isolated world: settings bridge
  settings-button.js          Isolated world: top-bar settings button and popover
  tweaks.css                  Styles for injected UI
popup/                        Settings page (toolbar popup and top-bar popover)
icons/                        Logo (icon.svg) and PNG sizes
mcp/legendkeeper-mcp/         MCP server for LegendKeeper (see below)
.claude/skills/legendkeeper-sdk/  Claude skill for the LegendKeeper API and SDK
```

## LegendKeeper MCP server

`mcp/legendkeeper-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude read and edit your LegendKeeper worlds through the official v3 API. Claude can browse, search, read and write pages in Markdown, set infobox facts, add map pins and timeline events, and upload images.

```sh
cd mcp/legendkeeper-mcp
npm install
npm run build
claude mcp add legendkeeper -e LEGENDKEEPER_KEY_OOO=lk_... -- node "$PWD/dist/index.js"
```

You need an API key per world: **Project Settings → Developers → API Keys** (requires a paid plan). Never commit keys. Keep them in your MCP client's config or in a local `.env`, which is git-ignored. See [`mcp/legendkeeper-mcp/README.md`](mcp/legendkeeper-mcp/README.md) for all options, including Claude desktop setup, Docker, multiple worlds and read-only mode.

## LegendKeeper SDK skill

`.claude/skills/legendkeeper-sdk` is a Claude skill covering LegendKeeper's v3 REST API and the `@legendkeeper/sdk` TypeScript client: operations, schemas, a style guide and 40+ runnable examples. Claude Code picks it up automatically when working in this repo. To use it everywhere, copy the folder to `~/.claude/skills/`.

## Development

There is no build step. Edit the files, reload the extension in `chrome://extensions`, then reload LegendKeeper.

Useful while working on it:

- `window.__LKT.patches`: patch status.
- `window.__LKT.store()`: LegendKeeper's entity store (for example `__LKT.store().resources.get(id)`).
- `window.__LKT.render()`: force a re-sync of the injected UI.

## Disclaimer

LegendKeeper Tweaks is an unofficial, personal project. It is not affiliated with or endorsed by LegendKeeper. The LK mark in the icon belongs to LegendKeeper.

## License

[MIT](LICENSE)
