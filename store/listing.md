# Chrome Web Store listing

Copy-paste text for the Chrome Web Store developer dashboard. The screenshots in `store/screenshots/` (git-ignored) are 1280×800 PNGs.

## Store listing tab

**Name:** LegendKeeper Tweaks

**Summary** (comes from `manifest.json`, 119 of 132 characters):

> Quality-of-life tweaks for LegendKeeper: page tabs, tag shortcuts, tree-preserving filters, cover-image icons and more.

**Category:** Productivity → Workflow & Planning

**Language:** English

**Description:**

```text
LegendKeeper Tweaks adds a set of small, optional quality-of-life improvements to LegendKeeper, the worldbuilding wiki for tabletop games and fiction.

It's for people who spend a lot of time in their LegendKeeper projects and want getting around, finding pages and filtering to be quicker. Everything is about usability: nothing adds new content to your pages, and nothing changes LegendKeeper for anyone else in a shared project. Every tweak can be switched on or off from a settings button next to Share.

TABS
• Page tabs along the top of the page: keep several pages open and switch between them in one click
• Middle-click any page link, or right-click a page → Open in new tab
• Drag to reorder, four tab styles, optional adaptive-width tabs
• Tabs are remembered for each project

FINDING AND FILTERING
• Tag shortcuts: drag a tag into the Project Browser to pin it, then click it to filter (with page counts)
• Keep the tree when filtering: matching pages stay nested where they are, with their parent folders greyed out, instead of turning into a flat list
• Your tag filter stays selected after a reload
• Recent pages and Suggested pages (learned from how you move around your project) under the filter box, at the bottom of the Project Browser, in the tab bar, or as their own tab
• Press / to jump straight into the filter box

PAGES
• Set for subpages: right-click a page to set full-width, table of contents, lock, hide, sidebar and icon options on it and everything under it, in one go
• Reading time on longer pages
• A size slider for the content block drag handle

COVER IMAGES
• A small crop of each page's cover image as its icon in the Project Browser, tabs, @mentions, backlinks and collection lists
• A larger cover preview when you hover a page

PRIVACY
• Runs only on legendkeeper.com
• No accounts, no analytics and no servers of its own: tabs, pins, history and settings stay in your browser
• The only feature that changes anything in your world is Set for subpages, and only after you review and confirm it

This is an unofficial, open-source project and isn't affiliated with or endorsed by LegendKeeper. Issues, ideas and pull requests are welcome on GitHub: https://github.com/Mackachoo/LegendKeeper-Tweaks
```

**Screenshots** (upload in this order):

1. `1-tabs-and-covers.png`: tabs, suggested tabs, cover icons, pinned tags, Recent pages
2. `2-right-click-menu.png`: Open in new tab and Set for subpages in the page menu
3. `3-set-for-subpages.png`: the Set for subpages dialog
4. `4-recents-tab.png`: the Recents tab in the Project Browser
5. `5-nested-tag-filter.png`: filtering by a tag while keeping the tree
6. `6-settings.png`: the settings panel

The store allows five screenshots, so drop one; I'd drop 4 or 2.

**Homepage URL / Support URL:** https://github.com/Mackachoo/LegendKeeper-Tweaks

## Privacy practices tab

**Single purpose:**

```text
Adds optional usability and quality-of-life improvements (tabs, filtering, shortcuts, page icons and bulk page settings) to the LegendKeeper web app at legendkeeper.com.
```

**Permission justifications:**

- **storage:**
  ```text
  Saves the user's on/off choices for each tweak, synced across their Chrome profile.
  ```
- **Host permission** (content scripts on `legendkeeper.com`):
  ```text
  The extension only works inside LegendKeeper. It runs on legendkeeper.com pages to add its tabs, shortcuts and filters to the LegendKeeper interface. It does not run on any other site.
  ```

**Are you using remote code?** No.

```text
All of the extension's code ships in the package. It does not download or run code from any server. To add its features it adjusts LegendKeeper's own page scripts on legendkeeper.com as they load.
```

**Data usage:** tick none of the data types. The extension reads LegendKeeper pages in the browser (for example page names and tags) to provide its features, but it doesn't send anything anywhere. Its storage is local, plus Chrome's own settings sync.

Tick all three certifications (no selling data, no unrelated use, no creditworthiness use).

**Privacy policy URL:** optional, since no user data is collected. If it asks for one, link the README's privacy section: https://github.com/Mackachoo/LegendKeeper-Tweaks#privacy-and-safety
