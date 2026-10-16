# Chrome Web Store listing

Copy-paste text for the Chrome Web Store developer dashboard. The screenshots in `store/screenshots/` are 1280×800 PNGs.

## Store listing tab

**Name:** Tweaks for LegendKeeper (comes from `manifest.json`)

**Summary** (comes from `manifest.json`, 119 of 132 characters):

> Quality-of-life tweaks for LegendKeeper: page tabs, tag shortcuts, tree-preserving filters, cover-image icons and more.

**Category:** Productivity → Workflow & Planning

**Language:** English

**Description:**

```text
Unofficial community project, not affiliated with or endorsed by LegendKeeper.

Tweaks for LegendKeeper adds small, optional quality-of-life improvements to LegendKeeper, the worldbuilding wiki for tabletop games and fiction.

It's for people who live in their LegendKeeper projects: running more than one campaign in the same world, prepping sessions across dozens of pages, or just wanting to get around faster. Nothing adds new content to your pages, nothing changes LegendKeeper for anyone else in a shared project, and every tweak can be switched on or off from a settings button next to Share.

PAGE TABS: WORK ON SEVERAL THINGS AT ONCE
Keep the session notes, the map, the NPC you're writing and the faction they belong to open side by side, and jump between them in one click instead of hunting through the tree each time.
• Middle-click any page link, or right-click a page → Open in new tab
• Drag to reorder; tabs are remembered for each project
• Four tab styles (pills, filled, minimal, underline), optional adaptive-width tabs

SUGGESTED PAGES: WHAT YOU'LL NEED NEXT
Learns how you move around your project (which pages you open after which, what you come back to, what you skip) and offers the pages you're likely to want next. Open the tavern and the innkeeper is already waiting.
• Shown as faded tabs at the end of the tab bar, in the Project Browser, or as their own tab
• Everything is worked out in your browser; nothing is sent anywhere
• Recent pages work the same way for where you've just been

TAG SHORTCUTS: ONE WORLD, SEVERAL CAMPAIGNS
Pin the tags you filter by most and switch with one click, with page counts on each. Turn on pinned page specific tags and each pinned page in LegendKeeper's shortcut bar gets its own set, so your Tuesday group's campaign and your Saturday group's campaign each show just their own sessions, NPCs and locations.
• Drag a tag into the Project Browser to pin it
• Your tag filter stays selected after a reload

FILTERS THAT KEEP YOUR TREE
Normally filtering by a tag flattens everything into one list. With this on, matching pages stay nested in their folders, with the parents shown only for context greyed out, so you still know that "The Drowned Vault" lives under Arginoth → Dungeons.
• Open and close folders and drag pages around while filtering
• Expand all / collapse all buttons beside the filter box
• Press / anywhere to jump into the filter box

SET FOR SUBPAGES: TIDY A WHOLE SECTION AT ONCE
Right-click a page to change it and everything under it in one go: lock a player-facing section before a session, hide your GM notes, give every NPC the same icon and colour, tag a whole region, or add an Image block to every character's sidebar.
• Full width, table of contents, lock, hide, sidebar, icon and colour
• Add or remove tags and sidebar blocks
• You review and confirm before anything is written; removals ask twice

COVER IMAGES AS ICONS
Recognise pages at a glance: a small crop of each page's cover image becomes its icon in the Project Browser, tabs, @mentions, backlinks and collection lists.
• Hover a page for a larger preview, cropped the same way as on the page
• Optionally load covers for pages you haven't opened yet, or fall back to the banner image

SMALLER TOUCHES
• Reading time on longer pages
• A size slider (0.75× to 2×) for the block drag handle

PRIVACY
• Runs only on legendkeeper.com
• No accounts, no analytics and no servers of its own: tabs, pins, history and settings stay in your browser
• The only feature that writes anything to your world is Set for subpages, and only after you confirm it

Open source: issues, ideas and pull requests are welcome at https://github.com/Mackachoo/LegendKeeper-Tweaks
```

**Screenshots** (upload in this order):

1. `1-settings.png`: the settings panel
2. `2-nested-tag-filter.png`: filtering by a tag while keeping the tree
3. `3-set-for-subpages.png`: the Set for subpages dialog
4. `4-recents-tab.png`: the Recents tab in the Project Browser

**Promo tiles** (same folder, 24-bit PNG, no transparency):

- Small promo tile (440×280): `promo-small.png`
- Marquee promo tile (1400×560): `promo-marquee.png`

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
