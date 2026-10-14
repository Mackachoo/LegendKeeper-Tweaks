# LegendKeeper style guide

This page lists the fields and values that make content written through the API look like content written in the app. Each section gives a default. Use it unless your project's existing content follows a different convention. The [SDK guide](GUIDE.md) documents every field named here.

The snippets assume `lk` is a client, the builders are imported from `@legendkeeper/sdk/blocks`, and ids such as `kingdom.id` come from earlier writes.

## Map pins

Write pins as glyphs without a shape: set `iconShape: 'none'` and set `iconGlyph` to a Font Awesome name. The app draws a shape-less glyph white with a black outline, so `iconColor` has no effect. Use a shape, `iconSize` and `iconColor` (`#RRGGBB`) only when someone asks for a shaped pin. Link each pin that has a page to that page with `uri`.

```ts
await lk.features.create(map, {
  type: 'pin',
  name: 'Candy Kingdom',
  pos: [12.5, -40.25],
  iconShape: 'none',
  iconGlyph: 'crown',
  uri: `lk://resources/${kingdom.id}`,
})
```

## Collection titles

A `collection` block shows a title above its list. Show the title only when it names the collection and doesn't repeat the heading above it. Otherwise, hide it with `isTitleHidden: true` rather than show a generic label such as "Collection".

```ts
h(2, 'Residents'),
collection({ filter: residentsOfThisPage, isTitleHidden: true }),
```

```ts
collection({ items: [finn.id, jake.id], title: 'Party', isTitleHidden: false }),
```

## Infoboxes

Put the facts a reader looks up at a glance in an infobox at the top of the page. An `infobox` block's rows are properties, such as a portrait, a `keyValue` of short facts and `links` to related pages. Keep long text in the page body. A new infobox floats right at 40% width.

```ts
infobox(
  property(image(portrait.url!, { alt: 'Princess Bubblegum', fill: true }), { title: 'Portrait', isTitleHidden: true }),
  property(keyValue([['Title', 'Princess of the Candy Kingdom'], ['Age', '827']]), { title: 'Facts' }),
  property(links([kingdom.id]), { title: 'Rules' }),
),
```

## Portraits and premier images

Put a page's main image, such as a character's portrait or a picture of a place, in the infobox as an image property with `fill: true`. A filled image runs to the infobox edges with no frame. Hide the property's title with `isTitleHidden: true`, as in the infobox above.

## Sidebar properties and infoboxes

Sidebar properties (`lk.properties.create`) appear beside every document of a resource. Use them for information that applies to all of the resource's documents. When the resource is a single wiki page, put that information in an infobox on the page instead.

```ts
await lk.properties.create({ resourceId: castle.id }, property(keyValue([['Ruler', 'Princess Bubblegum']]), { title: 'Facts' }))
```

## Parent pages

When a resource's own page is empty but its children have content, give the resource a short introduction and an untitled collection of its children. A `parentId` filter with the value `'$self'` lists the children of the resource that holds the block, in tree order, including children added later.

```ts
await lk.documents.replaceBlocks(
  { resourceId: npcs.id, documentId: npcs.documents[0]!.id },
  {
    blocks: [
      p('The people the party has met in the Candy Kingdom.'),
      collection({
        filter: { type: 'filter', filterType: 'field', id: 'children', field: 'parentId', operator: 'equals', value: '$self' },
        isTitleHidden: true,
      }),
    ],
  },
)
```

## Links between pages

Link a page to the pages it names:

- In text, use a `mention` run instead of the plain name.
- In an infobox or the sidebar, use a `links` property.
- On maps and timelines, set `uri` on each pin and event that has a page.

```ts
p('Ruled by ', mention({ resourceId: pb.id, text: 'Princess Bubblegum' }), ' from the Candy Castle.'),
```

```ts
await lk.timelines.createEvent(timeline, { laneId: lane.id, type: 'event', name: 'The Lich escapes', start, uri: `lk://resources/${lich.id}` })
```

## Banners and icons

Give section and landing pages a banner. Set `banner: { enabled: true, url, yPosition }` on the resource, using the `url` of an uploaded image asset.

Give every resource an `iconGlyph` and an `iconColor`, so it shows with an icon in the resource tree, mentions and collections. Use one glyph and color for all resources of the same kind.

```ts
await lk.resources.update({ resourceId: kingdom.id }, {
  iconGlyph: 'crown',
  iconColor: '#ff69b4',
  banner: { enabled: true, url: skyline.url!, yPosition: 50 },
})
```

## Timeline events

Give an event only a name, short enough to read on the timeline. Events have no description field. Put the longer account in a page under the timeline's resource, and link the event to that page with `uri`.

```ts
const account = await lk.resources.create({
  name: 'The Mushroom War',
  parentId: history.id,
  documents: [{ type: 'page', blocks: [p('The war that ended the old world and made the Land of Ooo.')] }],
})
await lk.timelines.createEvent(timeline, {
  laneId: lane.id,
  type: 'event',
  name: 'The Mushroom War',
  start,
  uri: `lk://resources/${account.id}`,
})
```

## Tags

Readers find resources by tag through tag search, collections filtered by tag, and tag indexes. When each tag names one facet, a filter can combine tags to select resources by more than one facet.

Read the project's tags before you write any. `lk.tags.list` returns every tag in the project with the number of resources that have it. It requires an ADMIN key; with a MEMBER key, read each resource's `tags` from `lk.resources.list`. Reuse existing tags with the same spelling and case. A tag filter matches tags exactly, so `NPC` and `npc` are different tags.

When the project has no tags, use separate facets instead of one tag per combination:

| Facet | Values |
| --- | --- |
| Type | `NPC`, `Location`, `Item`, `Faction`, `Event` |
| Place | the name of the settlement or region, such as `Candy Kingdom` |
| Status or role | `Ally`, `Villain`, `Deceased` |
| Arc or session | `The Lich`, `Session 12`, when the project tracks them |

Give a resource one tag from each facet that applies. For example, `NPC`, `Candy Kingdom` and `Ally` together select the Candy Kingdom's allies.

Readers see tags as written, in tag lists, filters and indexes. Write each tag as a short label in title case, with spaces between words, as you would write it in a heading. Use singular nouns. Don't add a tag that repeats the resource's parent or name, unless the tag selects resources across the tree that the parent doesn't. When you create a new scheme, list the tags and their meanings on one page of the project.

```ts
await lk.resources.create({ name: 'Peppermint Butler', parentId: kingdom.id, tags: ['NPC', 'Candy Kingdom', 'Ally'] })
await lk.resources.create({ name: 'Earl of Lemongrab', parentId: kingdom.id, tags: ['NPC', 'Candy Kingdom', 'Villain'] })
```

A collection filtered by two tags lists the resources that have both:

```ts
collection({
  filter: { type: 'filter', filterType: 'tag', id: 'allies', operator: 'has_all', tags: ['NPC', 'Ally'] },
  isTitleHidden: true,
})
```

For the other filter types and operators, see [Collection filters](GUIDE.md#collection-filters) in the SDK guide.
