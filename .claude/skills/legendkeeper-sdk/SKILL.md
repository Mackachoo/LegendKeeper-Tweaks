---
name: legendkeeper-sdk
description: Build integrations, scripts and importers for LegendKeeper (the worldbuilding / TTRPG wiki app) with its v3 REST API and the TypeScript SDK @legendkeeper/sdk. Use this whenever the user mentions LegendKeeper, an LK project, lk.resources / lk.documents / block builders, importing a campaign, world, wiki, Obsidian/Notion/World Anvil content into LegendKeeper, writing pages, infoboxes, maps, pins, timelines, calendars, boards or tags through code, or calling legendkeeper.com/api/v3 from any language, even if they don't say "SDK".
---

# LegendKeeper API and SDK

LegendKeeper's v3 REST API reads and writes a project's resources (the wiki tree), documents (page, map, timeline, board tabs), sidebar properties, blocks, map features, timeline lanes/events, calendars, assets, tags, search and members. `@legendkeeper/sdk` is a zero-dependency TypeScript client generated from the OpenAPI spec, with typed params, retries, idempotency keys, pagination and block builders.

This skill snapshots SDK **4.1.0** / API **3.0.0** (October 2026). Docs live at https://www.legendkeeper.com/developers/ (quickstart, guide, style, api, sdk, changelog). If something here disagrees with a newer SDK, trust the package: `npm view @legendkeeper/sdk version`, and `npm pack @legendkeeper/sdk` ships `GUIDE.md`, `STYLE.md`, `CHANGELOG.md`, `openapi.json` and `examples/`.

## Where to look

| Need | File |
| --- | --- |
| Exact signature, route, params, body fields, enums and limits of any of the 89 operations | `references/operations.md` (search `lk.<namespace>.<method>`) |
| Shape of any request/response/block/filter/calendar schema (184) | `references/schemas.md` (search `## <SchemaName>`) |
| Full official SDK guide with explanations and every runnable example | `references/guide.md` |
| Which fields/values make API content look like app-made content | `references/style.md` |
| Runnable example per topic (`worldbuilding.ts`, `maps.ts`, `timelines.ts`, `calendars.ts`, `boards.ts`, `infobox.ts`, `collection-filters.ts`, `templates.ts`, `create-many.ts`, `uploading-images.ts`, `idempotency.ts`, ...) | `references/examples/` |

Read the relevant section before writing non-trivial code: the API is strict (unknown fields are rejected) and these files are exact. Don't guess field names.

## Setup

```sh
npm install @legendkeeper/sdk          # Node 20+ or an edge runtime; ESM + CJS
export LEGENDKEEPER_API_KEY=lk_...     # optional: LEGENDKEEPER_BASE_URL for a proxy/mock
```

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { h, p, bold, mention, infobox, property, keyValue, collection } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! }) // timeoutMs 30000, maxRetries 2, fetch, baseUrl, idempotencyKeys
const project = await lk.project()
```

Scripts use top-level `await`: set `"type": "module"` or use `.mts`, run with `npx tsx file.ts`.

**API keys:** Project Settings → Developers → API Keys (needs ADMIN to create; secret shown once). The project owner must be on a paid plan (not trial) or every call gets 402 `PAID_PLAN_REQUIRED`. A key belongs to one project and acts as its creator with the lower of the key role (`MEMBER` default, or `ADMIN`) and the creator's current role. Top-level content, templates, `tags.list`, `resources.restore`, asset updates/deletes and invites need `ADMIN`. Keys are server-side secrets; the API rejects cross-site browser calls.

## Calling convention

- `lk.<namespace>.<method>(pathParams, options)`. First argument: path ids (`resourceId`, `documentId`, `blockId`, ...). Second: query params, body fields, `ifMatch`, `idempotencyKey`, `signal`, all flat in one object.
- `projectId` is always optional: the client resolves it once from the key.
- Operations whose only path param is `projectId` take options as the sole argument: `lk.resources.create({ name })`, `lk.search.search({ q })`.
- Namespaces: `resources templates documents properties blocks boards timelines calendars features assets search tags members invites projects`. Plus `lk.project()`, `lk.request()` (raw escape hatch) and `lk.assets.uploadImage()`.
- Other languages: plain HTTPS to `https://www.legendkeeper.com/api/v3/...` with `Authorization: Bearer <key>`, JSON bodies. Routes are in `operations.md`. Replicate the SDK's behaviour yourself: send `Idempotency-Key` on POSTs, `If-Match` on versioned writes, honour `Retry-After`. The CLI also works from any shell: `npx @legendkeeper/sdk resources list --query.limit 5 --paginate --pretty`.

## The data model in one screen

- **Resource** = an entry in the project tree (character, place, faction). Fields: `name`, `parentId` (null = root, `'templates'` = template root), `tags`, `aliases`, `iconGlyph` (Font Awesome name), `iconColor` `#RRGGBB`, `iconShape`, `iconSize`, `banner`, `isHidden`, `isLocked`, `permissions`, `rank`.
- A new resource has **one `blank` document** (`documents[0]`, named `Main`). The first typed write converts it: blocks → `page`; `features.create` or `documents.update({ mapImage })` → `map`; `timelines.createLane` → `time` (gregorian); board writes → `board`. Write to `documents[0]`; only call `documents.create` for extra tabs. You can also pass up to 5 `documents` (with `blocks`) to `resources.create`.
- **Page** = tree of typed blocks with ids; text blocks hold `content` runs (text + marks, mentions, breaks). Read with `documents.getBlocks` (has `.text` plain text and `.version`); write whole with `documents.replaceBlocks`, or surgically with `blocks.insert/update/replace/move/delete`.
- **Sidebar properties** sit beside every document of a resource; an **infobox** block holds the same property shape inside a page. Key-value rows have their own row endpoints for each of the three containers (keyValue block, sidebar property, infobox property).
- **Map** features: `pin | label | region | path | folder`, `pos` is `[lat, lng]` in the map image's frame. Use `pixelToPos(mapImage, x, y)` / `posToPixel` from the SDK.
- **Timeline**: lanes (`name`, `rank` like `a0`, `size` `sm|lg`) then events (`laneId`, `type` `event|note`, `start`/`end` in minutes, or `formattedStart`/`formattedEnd` strings parsed in the document's calendar). Built-in calendars: `gregorian harptos eberron exandria greyhawk elder-scrolls`; custom ones via `calendars.create(spec)`. Timelines can chain other timelines with `documents.update({ sources })`.
- **Board**: tldraw 3.9 records (shapes, bindings, assets); writes are atomic, up to 500 records.
- **Links**: `uri` on pins/events is `lk://resources/<id>`, `lk://documents/<id>`; `''` clears it.
- **Images**: every image field accepts only the `url` of an image asset of the same project. Upload first with `lk.assets.uploadImage({ data, contentType, name })` (jpeg/png/gif/webp), then use `asset.url`. External URLs and `data:`/`blob:` URIs are rejected.

## Rules that prevent most bugs

1. **Version every content edit.** Pass the `version` you read as `ifMatch` on `documents.replaceBlocks`, `blocks.*` writes, row writes, `boards.*` writes and `calendars.update/delete`. On `VersionMismatchError` (412) re-read, reapply, rewrite. Without `ifMatch` you silently overwrite edits made in the app.
2. **`replaceBlocks` replaces everything.** Blocks you omit are deleted, including `{ kind: 'unsupported', id }` blocks you can't read: echo those back by id to keep them, or use single-block ops. Echo existing block ids to keep them stable; use `withId(id, block)` for deterministic ids in re-runnable scripts. Older app-made docs may lack block ids: call `documents.assignBlockIds` once before addressing blocks.
3. **Make imports idempotent.** POSTs already get a generated `Idempotency-Key` per call (safe retries). For re-runnable scripts pass your own deterministic key (`idempotencyKey: 'import-row-42'`, 1–255 chars of `A-Za-z0-9._-`, kept 24 h) and/or your own resource `id` (cuid2: a lowercase letter + 7 or 23 lowercase alphanumerics, e.g. `` `r${crypto.randomUUID().replaceAll('-', '').slice(0, 23)}` ``). Reusing an id answers 409 `DUPLICATE_ID`, even for deleted resources.
4. **Respect rate limits.** Per key: 120 writes/min, 3,000 writes/h, 300 requests/min, 6,000/h, 60,000/day; 12,000/h per project across keys. Bulk work: use `resources.createMany` (≤100 per call, counts as one write; items budget 600/min, 6,000/h; all-or-nothing validation; children may reference earlier items' `id` as `parentId`), pass `documents` inline on create, and space other writes ≥0.5 s (≥1.2 s past 3,000 writes). The client auto-retries 429/502/503/504/timeouts with backoff, but throws `RateLimitError` immediately when `Retry-After` > 8 s (check `retryAfterMs`).
5. **Paginate properly.** Server-paged lists (`resources.list`, `templates.list`, `assets.list`, `projects.list`, `timelines.listEvents`) take `limit` ≤ 100 and an opaque `cursor`. Use `for await (const x of await lk.resources.list())` to walk everything, or `page.next()`. Other lists return everything in one `Page`. Sort siblings by `rank` with plain string comparison (not `localeCompare`).
6. **Deleting a parent** throws 409 `HAS_CHILDREN` unless `{ cascade: true }`. `resources.restore` (ADMIN) brings back the subtree; deleted resources aren't listed, so keep ids you may restore.
7. **Branch on `error.code`, never `message`.** Classes: `ValidationError` 400 (`errors[]` with dotted `path`), `AuthenticationError` 401, `PermissionError` 403, `NotFoundError` 404, `ConflictError` 409, `VersionMismatchError` 412, `RateLimitError` 429, `ServerError` 5xx, `LegendKeeperError` other, `ConnectionError` (no response; not a `LegendKeeperError`). Log `error.requestId` when reporting problems. Full code table: `guide.md` → Error codes.
8. **Block validity.** `listItem` can't sit at top level; wrap raw runs in a paragraph (or pass them to `ul`/`ol`/`li`); callout `icon`/`color` only with tone `custom`; body >1 MB is refused (413); a document past its size limit answers 422 `DOCUMENT_TOO_LARGE`.

## Block builders (`@legendkeeper/sdk/blocks`)

Text: `p(...)`, `h(level 1-6, ...)`, `quote`, `code(text, lang?)`, `rule()`, `callout(tone, children, {icon?, color?})` (tones `info note success warning error custom`), `expand(title, ...children)`, `secret(...)` (hidden from players).
Lists/tables: `ul(...)`, `ol(items, {start?})`, `li`, `tasks(task(checked, ...))`, `table(tr(th([...]), td([...])))`.
Layout: `layout(column(50, ...), column(50, ...))`; layout-able blocks take `layout` (`default wrapLeft wrapRight center alignStart alignEnd`) and `width` 10–100.
Rich: `image(asset.url, {alt, fill, title, isTitleHidden})`, `embed('youtube'|'spotify'|'soundcloud', url)`, `keyValue([[k, v], ...], {display: 'list'|'grid'|'inline'})`, `meter(mode, items)` (`bar wheel gauge-180 gauge-270 pool rating`), `links([resourceId])`, `collection({ items } | { filter })`, `map({ resourceId, documentId }, { viewport? })`, `textField(...)`, `infobox(property(...), ...)`, `property(block, { title, isTitleHidden, isHidden })`, `withId(id, block)`.
Runs: `bold italic underline strike mono sub sup link(href, ...) mention({ resourceId, documentId?, text? }) br runs(...)`. Strings are fine anywhere text is expected: `p('Ruled by ', mention({ resourceId: pb.id }), '.')`.
Readers: `plainText(x)`, `walk(x, (block, path) => ...)`, `findBlock(x, id)`. Enums: `BlockKind CalloutTone EmbedProvider KeyValueDisplay BlockLayout MeterMode PropertyKind`.

Collection filters (`collection({ filter })`): `{ type: 'filter', id, filterType, ... }` with `filterType` `field` (`parentId`/`name`; `scope: 'edges'` + `targetId` for backlinks), `tag` (`has_all has_any has_none`, exact case), `property` (KEY_VALUE/METER values), `mention`, `text` (`contains`), `composite` (`and or not`). `'$self'` means the resource holding the page. See `guide.md` → Collection filters.

## Style defaults (make API content look native)

From `references/style.md`; follow the project's existing conventions if they differ.
- Give every resource `iconGlyph` + `iconColor`, consistent per kind. Banners on section/landing pages via `banner: { enabled: true, url, yPosition }`.
- Map pins: `iconShape: 'none'` + `iconGlyph`, and `uri` to the pin's page. Shaped/coloured pins only if asked.
- Put glance facts in an infobox at the top: portrait as `property(image(url, { fill: true }), { title: 'Portrait', isTitleHidden: true })`, a `keyValue` of facts, `links` to related pages. Long text stays in the body. Use sidebar properties only for facts shared by all of a resource's documents.
- Link names: `mention` runs in text, `links` properties in infoboxes/sidebar, `uri` on pins and events.
- Collections: `isTitleHidden: true` unless the title names the collection and doesn't repeat the heading above.
- Parent pages with empty content: one-line intro + `collection` filtered by `parentId equals '$self'`.
- Timeline events: short name only (no description field); put the account in a child page and link via `uri`.
- Tags: read existing tags first (`tags.list`, ADMIN) and reuse exact spelling/case. New schemes use one tag per facet (Type: `NPC Location Item Faction Event`; Place; Status/role: `Ally Villain Deceased`; Arc/session), title case, singular, not repeating the parent or name.

## Typical workflow for an import or sync

1. `lk.project()` to confirm the key and project; check role needs (ADMIN for top-level writes).
2. Read what exists (`resources.list` with `for await`, `tags.list`, `search.search`), map source records to stable ids you store.
3. Upload images once (`assets.uploadImage`), keep a source-path → `asset.url` map.
4. Create the tree top-down with `resources.createMany` (own `id`s, `parentId` chaining, inline `documents`), or `resources.create` + `replaceBlocks` per page.
5. Second pass for cross-links (mentions, `links`, collections, pin/event `uri`) once all ids exist.
6. On re-runs: `resources.get` by stored id, `getBlocks` → modify → `replaceBlocks` with `ifMatch`.
7. Throttle, catch typed errors, log `requestId`s, and test against a throwaway resource (`try/finally` delete) before touching real content.

Template ops (4.1.0): `templates.list`, `resources.saveAsTemplate({ resourceId }, { name?, includeChildren? })`, `resources.createFromTemplate({ templateId, name?, parentId?, includeChildren? })`.

## TypeScript types

`components['schemas']['<Name>']` for any schema; `Extract<Operation, { id: 'createResource' }>` with `Options<O>` / `Result<O>`; `Page<T>`; `Block` is a union discriminated by `kind`. Versioned results include `version: string`.
