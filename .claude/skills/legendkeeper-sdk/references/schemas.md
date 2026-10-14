# LegendKeeper v3 schemas

Every schema in the OpenAPI spec, in compact form. In TypeScript use `components['schemas']['<Name>']` from `@legendkeeper/sdk`.

## Asset
  - `id`: string
  - `name`: string
  - `type`: "IMAGE" | "MAP" | "FOLDER" | "AUDIO"
  - `folderId`?: string | null
  - `isHidden`?: boolean
  - `description`?: string | null
  - `url`?: string — The file URL of an IMAGE asset, always on a LegendKeeper asset host.
  - `width`?: number — Pixel width of an IMAGE asset, read from the stored file.
  - `height`?: number — Pixel height of an IMAGE asset, read from the stored file.
  - `createdAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.

## AssetCreateParams
  - `name`: string (minLength 1, maxLength 200) — Folder name, 1–200 characters (this endpoint provisions a folder; images upload through createImageUpload and createImageAsset).
  - `folderId`?: string (maxLength 256) — Parent folder ID (root if omitted). It must be the id of a FOLDER asset in this project; any other id answers 400 VALIDATION_ERROR at `folderId`.

## AssetList
  - `data`: Asset[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## AssetUpdateParams
  - `name`?: string (minLength 1, maxLength 200) — New name, 1–200 characters.
  - `description`?: string (maxLength 10000)
  - `folderId`?: string (maxLength 256) | null (maxLength 256) — Move to a folder; null moves to root. It must be the id of a FOLDER asset in this project that is neither the asset itself nor inside it; any other id answers 4…
  - `isHidden`?: boolean

## Block
A content block. Container kinds carry `children`; text kinds carry `content` runs. A container written with no children reads back holding one empty paragraph. `unsupported` blocks are read-only placeholders for content the public model cannot express; echo them by id to preserve them. Nesting through `children`, `rows` and filter `filters` is limited to 64 levels; deeper input answers 400 VALIDA…
  - one of: ParagraphBlock | HeadingBlock | QuoteBlock | CodeBlock | RuleBlock | BulletListBlock | OrderedListBlock | ListItemBlock | TaskListBlock | TaskItemBlock | TableBlock | TableRowBlock | TableCellBlock | CalloutBlock | ExpandBlock | LayoutBlock | LayoutColumnBlock | ImageBlock | EmbedBlock | KeyValueBlock | InfoboxBlock | MeterBlock | ResourceCollectionBlock | ResourceLinkBlock | MapBlock | SecretBlock | TextFieldBlock | UnsupportedBlock

## BlockIdsResult
  - `assigned`: integer (minimum 0)
  - `version`: string

## BlockInsertRequest
At most one of after, before, parent; none appends at the end of the document. An id in `block` or its subtree is kept. An id that another block of the document already uses answers 409 DUPLICATE_ID with its path (`block.id`, `block.children[0].id`), and nothing is written. The same id twice in the body answers 400 VALIDATION_ERROR.
  - `block`: Block — A content block. Container kinds carry `children`; text kinds carry `content` runs. A container written with no children reads back holding one empty paragraph.…
  - `after`?: string (maxLength 256) — Insert after this block id.
  - `before`?: string (maxLength 256) — Insert before this block id.
  - `parent`?: string (maxLength 256) — Append as the last child of this container block.

## BlockLayout
Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap beside it. `center`, `alignStart` and `alignEnd` place a narrowed block on its own line.
- "default" | "wrapLeft" | "wrapRight" | "center" | "alignStart" | "alignEnd"

## BlockMoveRequest
Exactly one of after, before, parent.
  - `after`?: string (maxLength 256) — Insert after this block id.
  - `before`?: string (maxLength 256) — Insert before this block id.
  - `parent`?: string (maxLength 256) — Append as the last child of this container block.

## BlockPatch
Shallow update of a block's own fields (content, level, text, language, checked, title, isTitleHidden, fill, tone, icon, color, header, colspan, rowspan, start, width, url, alt, provider, layout, display, rows, mode, items, showText, showIcon, showMax, view, filter, resourceId, documentId, viewport, displayHeight). `kind`, `id` and `children` cannot be patched and answer 400 VALIDATION_ERROR.
  - `content`?: Run[] (max 10000)
  - `level`?: integer (minimum 1, maximum 6)
  - `text`?: string (maxLength 100000)
  - `language`?: string (maxLength 256)
  - `checked`?: boolean
  - `title`?: string (maxLength 2048) | string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `fill`?: boolean | boolean
  - `tone`?: "info" | "note" | "success" | "warning" | "error" | "custom"
  - `icon`?: string (maxLength 256)
  - `color`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Icon color and background tint, as `#RRGGBB`. Accepted only when `tone` is `custom`; the other tones draw their own color.
  - `header`?: boolean
  - `colspan`?: integer (minimum 1)
  - `rowspan`?: integer (minimum 1)
  - `start`?: integer (minimum 0)
  - `width`?: number (minimum 0, maximum 100) | integer (minimum 10, maximum 100)
  - `url`?: string (maxLength 2048)
  - `alt`?: string (maxLength 500)
  - `provider`?: "youtube" | "spotify" | "soundcloud"
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `display`?: "list" | "grid" | "inline"
  - `rows`?: ({ id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), key: string (maxLength 2048), content?: (object | object | object)[] (max 10000), text?: string (maxLength 100000) })[] (max 256) | PropertyBlock[] (max 256)
  - `mode`?: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating"
  - `items`?: ({ id?: string (minLength 1, maxLength 256), name: string (maxLength 2048), icon: string (maxLength 256), ratingIcon?: string (maxLength 256), current: number (minimum 0), max: number (minimum 1), color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) | "none" })[] (max 256) | { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256) | { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `showText`?: boolean
  - `showIcon`?: boolean
  - `showMax`?: boolean
  - `filter`?: FilterPredicate — A collection filter. `composite` combines `filters` with `and`, `or` or `not`. Nesting through `children`, `rows` and filter `filters` is limited to 64 levels; …
  - `resourceId`?: string (minLength 1, maxLength 256)
  - `documentId`?: string (minLength 1, maxLength 256)
  - `viewport`?: MapViewport — The view a map opens at: `center` as `[lat, lng]` in the map's coordinate frame, the frame of a feature's `pos`, and the Leaflet `zoom` level.
  - `displayHeight`?: number (minimum 150, maximum 800)

## BlockPropertyList
  - `data`: PropertyBlock[]
  - `version`: string

## BoardAsset
A tldraw asset record, typed by tldraw's `TLAsset`. Image and video shapes reference one by `props.assetId`.
  - `id`: string — A tldraw asset id, `asset:…`.
  - `typeName`: "asset"
  - `type`: "image" | "video" | "bookmark"
  - `props`: Record<string, any> — The props of the asset type (`TLImageAsset`, `TLVideoAsset`, `TLBookmarkAsset`). An image `src` is the `url` of an image asset of this project; a video `src` is…
  - `meta`: Record<string, any>

## BoardAssetInput
  - `id`?: string (maxLength 256) — Optional `asset:…` id; one is minted when omitted.
  - `typeName`?: "asset"
  - `type`: "image" | "video" | "bookmark"
  - `props`: Record<string, BoardJsonValue> — Every prop of the asset type. An image `src` must be the `url` of an image asset of this project and a video `src` a LegendKeeper asset URL; a `data:` or `blob:…
  - `meta`?: Record<string, JsonValue> — Free-form meta of the record.

## BoardBinding
A tldraw binding record, typed by tldraw's `TLBinding`. An arrow end attached to a shape is a binding from the arrow to that shape.
  - `id`: string — A tldraw binding id, `binding:…`.
  - `typeName`: "binding"
  - `type`: string — The binding type: `arrow`.
  - `fromId`: string — The arrow shape the binding starts at.
  - `toId`: string — The shape the arrow end is attached to.
  - `props`: Record<string, any> — `TLArrowBindingProps`: `terminal` (`start` or `end`), `normalizedAnchor`, `isExact`, `isPrecise`.
  - `meta`: Record<string, any>

## BoardBindingInput
A binding to create. `fromId` names an arrow shape and `toId` the shape its terminal attaches to; either may be a shape created in the same request.
  - `id`?: string (maxLength 256) — Optional `binding:…` id; one is minted when omitted.
  - `typeName`?: "binding"
  - `type`: string (maxLength 256)
  - `fromId`: string (maxLength 256)
  - `toId`: string (maxLength 256)
  - `props`?: Record<string, BoardJsonValue> — For an `arrow` binding, `terminal` (`start` or `end`) is required; `normalizedAnchor` defaults to the centre of the target, `isExact` and `isPrecise` to false.
  - `meta`?: Record<string, JsonValue> — Free-form meta of the record.

## BoardContent
Every page, shape, binding and asset record of a board. Records are returned as stored.
  - `schema`: BoardSchemaVersion — The serialized tldraw schema (`SerializedSchema`) that writes are validated against.
  - `pages`: BoardPage[]
  - `shapes`: BoardShape[]
  - `bindings`: BoardBinding[]
  - `assets`: BoardAsset[]
  - `version`: string — The board `version`, also sent as `ETag`. Send it back as `If-Match` to fail with 412 instead of overwriting a change made since.

## BoardContentReplaceParams
Records are validated with tldraw's own validators for the schema in `BoardContent.schema`, the schema the app's board view uses. A failure answers 400 VALIDATION_ERROR with one `errors[]` entry per failing field, such as `shapes[2].props.w`. A `data:` or `blob:` URI in an image, video or bookmark asset or in a shape `url` answers 400 VALIDATION_ERROR naming the field: boards hold no inline image …
  - `shapes`: BoardShapeInput[] (max 500)
  - `bindings`?: BoardBindingInput[] (max 500)
  - `assets`?: BoardAssetInput[] (max 500)

## BoardJsonValue
Any JSON value: a string of up to 100,000 characters, a number, a boolean, null, an array of up to 10,000 values, or an object of up to 10,000 keys of up to 256 characters. Arrays and objects nest at most 32 levels.
  - one of: string (maxLength 100000) | number | boolean | null | BoardJsonValue[] (max 10000) | Record<string, BoardJsonValue>

## BoardPage
A tldraw page record. The app shows one page per board.
  - `id`: string — A tldraw page id, `page:…`.
  - `typeName`: "page"
  - `name`: string
  - `index`: string — Fractional index ordering the pages.
  - `meta`: Record<string, any>

## BoardSchemaVersion
The serialized tldraw schema (`SerializedSchema`) that writes are validated against.
  - `schemaVersion`: number
  - `sequences`: Record<string, number>

## BoardShape
A tldraw shape record, typed by tldraw's `TLShape`.
  - `id`: string — A tldraw shape id, `shape:…`.
  - `typeName`: "shape"
  - `type`: string — The shape type: `arrow`, `bookmark`, `content-block`, `draw`, `element`, `embed`, `frame`, `geo`, `group`, `highlight`, `image`, `line`, `note`, `text`, `video`…
  - `x`: number
  - `y`: number
  - `rotation`: number — Radians.
  - `index`: string — Fractional index ordering the shape among the children of its parent; a higher index draws above.
  - `parentId`: string — The page (`page:…`) or the frame or group shape (`shape:…`) that contains the shape.
  - `isLocked`: boolean
  - `opacity`: number
  - `props`: Record<string, any> — The props of the shape type, exactly as tldraw 3.9 defines them (`TLGeoShapeProps`, `TLTextShapeProps` and so on).
  - `meta`: Record<string, any>

## BoardShapeInput
A shape to create. `x`, `y` and `rotation` default to 0, `isLocked` to false, `opacity` to 1 and `meta` to `{}`.
  - `id`?: string (maxLength 256) — Optional `shape:…` id; one is minted when omitted.
  - `typeName`?: "shape"
  - `type`: string (maxLength 256) — The shape type: `arrow`, `bookmark`, `content-block`, `draw`, `element`, `embed`, `frame`, `geo`, `group`, `highlight`, `image`, `line`, `note`, `text`, `video`…
  - `x`?: number
  - `y`?: number
  - `rotation`?: number
  - `index`?: string (maxLength 65536) — Fractional index among the children of the parent. Omitted, the shape is placed above its siblings.
  - `parentId`?: string (maxLength 256) — A page or a shape on this board. Defaults to the first page.
  - `isLocked`?: boolean
  - `opacity`?: number
  - `props`?: Record<string, BoardJsonValue> — Props of the shape type. Missing props take the app's defaults for the type; tldraw validates the result.
  - `meta`?: Record<string, JsonValue> — Free-form meta of the record.

## BoardShapeList
  - `data`: BoardShape[]
  - `version`: string

## BoardShapePatch
A partial shape. Top-level fields sent replace the stored ones; `props` and `meta` merge one level deep, as tldraw's `updateShapes` does.
  - `id`: string (maxLength 256) — The shape to update.
  - `type`?: string (maxLength 256) — Optional; when sent it must equal the shape's type.
  - `x`?: number
  - `y`?: number
  - `rotation`?: number
  - `index`?: string (maxLength 65536)
  - `parentId`?: string (maxLength 256)
  - `isLocked`?: boolean
  - `opacity`?: number
  - `props`?: Record<string, BoardJsonValue> — Props to change; the others keep their values.
  - `meta`?: Record<string, JsonValue> — Meta keys to change; the others keep their values.

## BoardShapesCreateParams
Records are validated with tldraw's own validators for the schema in `BoardContent.schema`, the schema the app's board view uses. A failure answers 400 VALIDATION_ERROR with one `errors[]` entry per failing field, such as `shapes[2].props.w`. A `data:` or `blob:` URI in an image, video or bookmark asset or in a shape `url` answers 400 VALIDATION_ERROR naming the field: boards hold no inline image …
  - `shapes`: BoardShapeInput[] (max 500)
  - `bindings`?: BoardBindingInput[] (max 500)
  - `assets`?: BoardAssetInput[] (max 500)

## BoardShapesCreated
  - `shapes`: BoardShape[]
  - `bindings`: BoardBinding[]
  - `assets`: BoardAsset[]
  - `version`: string — The board `version`, also sent as `ETag`. Send it back as `If-Match` to fail with 412 instead of overwriting a change made since.

## BoardShapesDeleteParams
  - `ids`: string (maxLength 256)[] (min 1, max 500) — Shape ids to delete.

## BoardShapesDeleted
  - `shapeIds`: string[] — Every shape deleted: the named shapes and the shapes they contained.
  - `bindingIds`: string[] — Every binding deleted because one of its ends was deleted.
  - `version`: string — The board `version`, also sent as `ETag`. Send it back as `If-Match` to fail with 412 instead of overwriting a change made since.

## BoardShapesUpdateParams
Records are validated with tldraw's own validators for the schema in `BoardContent.schema`, the schema the app's board view uses. A failure answers 400 VALIDATION_ERROR with one `errors[]` entry per failing field, such as `shapes[2].props.w`. A `data:` or `blob:` URI in an image, video or bookmark asset or in a shape `url` answers 400 VALIDATION_ERROR naming the field: boards hold no inline image …
  - `shapes`: BoardShapePatch[] (min 1, max 500)

## BoardShapesUpdated
  - `shapes`: BoardShape[]
  - `version`: string — The board `version`, also sent as `ETag`. Send it back as `If-Match` to fail with 412 instead of overwriting a change made since.

## BulletListBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "bulletList"
  - `children`: Block[] (max 10000)

## Calendar
A calendar specification with its `id` and `version`. The built-in calendars are `gregorian`, `harptos`, `eberron`, `exandria`, `greyhawk`, `elder-scrolls`.
  - `id`: string — The calendar id. A timeline document names its calendar by this id as `calendarId`.
  - `name`: string (minLength 1, maxLength 500) — Display name, 1 or more characters.
  - `description`?: string (maxLength 10000) — Free text shown with the calendar.
  - `hasZeroYear`: boolean — True when a year 0 exists. False makes year -1 directly precede year 1, as in the Gregorian calendar.
  - `maxMinutes`: number — The latest minute the calendar represents.
  - `months`: CalendarMonth[] (min 1, max 1000) — The months of the year in order. At least one.
  - `leapDays`: CalendarLeapDay[] (max 1000) — Leap days. May be empty.
  - `weekdays`: CalendarWeekday[] (min 1, max 1000) — The days of the week in order. At least one.
  - `epochWeekday`: number (minimum 0) — Zero-based index into `weekdays` of the weekday of the epoch's first day. A value outside `weekdays` answers 400 VALIDATION_ERROR at `epochWeekday`.
  - `weekResetsEachMonth`?: boolean — True starts every month on the first weekday. False or absent lets weeks run on across month boundaries.
  - `hoursInDay`: number (minimum 1) — Hours in a day, 1 or more.
  - `minutesInHour`: number (minimum 1) — Minutes in an hour, 1 or more.
  - `negativeEra`?: CalendarNegativeEra — The era before the epoch. Absent, the calendar starts at the first forward era.
  - `positiveEras`: CalendarEra[] (min 1, max 1000) — Forward eras in ascending `startsAt` order. At least one; the first usually starts at 0. Eras out of `startsAt` order answer 400 VALIDATION_ERROR at the field.
  - `moons`?: CalendarMoon[] (max 1000) — Moons. Absent or empty means none.
  - `format`?: CalendarFormat — Templates for formatted dates, including `formattedStart` and `formattedEnd` on events. Tokens: `YYYY` year, `E` era abbreviation, `EE` era name, `MMMM` month n…
  - `halfClock`?: boolean (default false) — True renders times on a 12-hour clock with AM and PM when `hoursInDay` is even. Defaults to false.
  - `version`: string — The calendar version, also sent as `ETag` by createCalendar and updateCalendar. Send it as `If-Match` to updateCalendar or deleteCalendar to fail with 412 inste…

## CalendarEra
A forward era. Dates from `startsAt` until the next era's `startsAt` belong to it.
  - `id`: string (maxLength 256) — Stable id, unique among the calendar's eras.
  - `name`: string (minLength 1, maxLength 500) — Display name, such as `Common Era` or `Before Common Era`. Rendered by the `EE` format token.
  - `abbr`?: string (maxLength 256, default "AD") — Abbreviation rendered by the `E` format token, such as `CE` or `BCE`. Defaults to `AD`.
  - `hideAbbr`?: boolean (default false) — Leaves the abbreviation out of formatted dates. Defaults to false.
  - `startsAt`: integer (minimum 0, maximum 9007199254740991) — The minute the era begins, a whole number 0 or more. Each era must start later than the one before it.
  - `resetMode`: "year" | "calendar" | "none" — `none`: years keep counting from the calendar epoch. `year`: year numbering restarts at the era start, as regnal years do. `calendar`: year, month and day numbe…

## CalendarFormat
Templates for formatted dates, including `formattedStart` and `formattedEnd` on events. Tokens: `YYYY` year, `E` era abbreviation, `EE` era name, `MMMM` month name, `MMM` month abbreviation, `M` and `MM` month number, `D` and `DD` day number, `DDDD` weekday name, `DDD` weekday abbreviation, `H` and `HH` hour, `m` and `mm` minute. `^` after a number adds an ordinal suffix (`D^` renders `1st`). Text…
  - `id`: string (maxLength 256) — Name of the format preset, such as `american-verbose`.
  - `year`: string (maxLength 256) — Template for a date shown to the year, such as `YYYY E`.
  - `month`: string (maxLength 256) — Template for a date shown to the month, such as `MMMM YYYY E`.
  - `day`: string (maxLength 256) — Template for a date shown to the day, such as `MMMM D^, YYYY E`.
  - `time`: string (maxLength 256) — Template for a date shown to the minute, such as `MMMM D^, YYYY E, HH:mm`.

## CalendarLeapDay
An extra day added to one month in the years its `interval` selects.
  - `id`: string (maxLength 256) — Stable id, unique among the calendar's leap days.
  - `name`: string (minLength 1, maxLength 500) — Display name, such as `Leap Day`.
  - `intercalary`: boolean — Stored with the leap day; the app writes false. Date arithmetic does not read it.
  - `month`: number (minimum 0) — Zero-based index into `months` of the month the leap day lengthens by one day. A value outside `months` answers 400 VALIDATION_ERROR at the field.
  - `addsWeekDay`: boolean — Stored with the leap day; the app writes false. Date arithmetic does not read it.
  - `day`: number (minimum 0) — Stored with the leap day; the app writes 1. Date arithmetic adds the leap day to the end of `month` and does not read this field.
  - `weekDay`: string (maxLength 256) — Stored with the leap day; the app writes an empty string. Date arithmetic does not read it.
  - `interval`: string (maxLength 256) — The years the leap day occurs in, as comma-separated terms. `4` is every fourth year; a `!` term removes years, so `400,!100,4` is the Gregorian rule (every fou…
  - `offset`: number — Year offset applied to every term of `interval`. 0 aligns the cycle with year 0.

## CalendarList
  - `data`: Calendar[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## CalendarMonth
A month. Months run in array order; a year is every month whose `interval` includes that year, plus the leap days that fall in it.
  - `id`: string (maxLength 256) — Stable id, unique among the calendar's months.
  - `name`: string (minLength 1, maxLength 500) — Display name, 1 or more characters.
  - `isIntercalary`: boolean — Marks a festival or gap period that sits between regular months. Date arithmetic counts an intercalary month like any other month.
  - `length`: number (minimum 1) — Days in the month, 1 or more.
  - `interval`: number (minimum 1) — The month occurs every `interval` years: 1 is every year, 4 is every fourth year. A whole number, 1 or more. Any other value answers 400 VALIDATION_ERROR at the…
  - `offset`: number — Shifts which years a month with `interval` above 1 occurs in. Ignored when `interval` is 1.

## CalendarMoon
A moon whose phases the calendar view shows.
  - `id`: string (maxLength 256) — Stable id, unique among the calendar's moons.
  - `name`: string (minLength 1, maxLength 500) — Display name, 1 or more characters.
  - `phase`: number — Length of one full lunar cycle in minutes. May be fractional.
  - `shift`: number — Offset of the cycle in minutes. May be negative or fractional.
  - `color`?: string (maxLength 64, default "#FFFFFF") — Display color as a hex code. Defaults to `#FFFFFF`.

## CalendarNegativeEra
The era before the epoch. Absent, the calendar starts at the first forward era.
  - `id`: string (maxLength 256) — Stable id, unique among the calendar's eras.
  - `name`: string (minLength 1, maxLength 500) — Display name, such as `Common Era` or `Before Common Era`. Rendered by the `EE` format token.
  - `abbr`?: string (maxLength 256, default "AD") — Abbreviation rendered by the `E` format token, such as `CE` or `BCE`. Defaults to `AD`.
  - `hideAbbr`?: boolean (default false) — Leaves the abbreviation out of formatted dates. Defaults to false.
  - `startsAt`: integer (minimum -9007199254740991, maximum 9007199254740991) — The earliest minute the calendar represents, a negative whole number. Dates from here to minute -1 belong to this era and count their years backwards.
  - `resetMode`: "none" — Always `none`.

## CalendarSpec
A calendar specification: the months, weekdays, leap days, eras, moons, clock and date formats that timelines render dates in. Event times are stored as minutes from the epoch, so a calendar change re-renders existing events without moving them. Unknown fields answer 400 VALIDATION_ERROR.
  - `id`?: string (minLength 1, maxLength 100) — The calendar id, 1–100 characters. On createCalendar it is optional and minted when absent; an id already in the project or equal to a built-in id answers 409 D…
  - `name`: string (minLength 1, maxLength 500) — Display name, 1 or more characters.
  - `description`?: string (maxLength 10000) — Free text shown with the calendar.
  - `hasZeroYear`: boolean — True when a year 0 exists. False makes year -1 directly precede year 1, as in the Gregorian calendar.
  - `maxMinutes`: number — The latest minute the calendar represents.
  - `months`: CalendarMonth[] (min 1, max 1000) — The months of the year in order. At least one.
  - `leapDays`: CalendarLeapDay[] (max 1000) — Leap days. May be empty.
  - `weekdays`: CalendarWeekday[] (min 1, max 1000) — The days of the week in order. At least one.
  - `epochWeekday`: number (minimum 0) — Zero-based index into `weekdays` of the weekday of the epoch's first day. A value outside `weekdays` answers 400 VALIDATION_ERROR at `epochWeekday`.
  - `weekResetsEachMonth`?: boolean — True starts every month on the first weekday. False or absent lets weeks run on across month boundaries.
  - `hoursInDay`: number (minimum 1) — Hours in a day, 1 or more.
  - `minutesInHour`: number (minimum 1) — Minutes in an hour, 1 or more.
  - `negativeEra`?: CalendarNegativeEra — The era before the epoch. Absent, the calendar starts at the first forward era.
  - `positiveEras`: CalendarEra[] (min 1, max 1000) — Forward eras in ascending `startsAt` order. At least one; the first usually starts at 0. Eras out of `startsAt` order answer 400 VALIDATION_ERROR at the field.
  - `moons`?: CalendarMoon[] (max 1000) — Moons. Absent or empty means none.
  - `format`?: CalendarFormat — Templates for formatted dates, including `formattedStart` and `formattedEnd` on events. Tokens: `YYYY` year, `E` era abbreviation, `EE` era name, `MMMM` month n…
  - `halfClock`?: boolean (default false) — True renders times on a 12-hour clock with AM and PM when `hoursInDay` is even. Defaults to false.

## CalendarWeekday
A day of the week. Days cycle through `weekdays` in array order.
  - `id`: string (maxLength 256) — Stable id, unique among the calendar's weekdays.
  - `name`: string (maxLength 500) — Display name, such as `Finnsday`.

## CalloutBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "callout"
  - `tone`: "info" | "note" | "success" | "warning" | "error" | "custom"
  - `icon`?: string (maxLength 256)
  - `color`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Icon color and background tint, as `#RRGGBB`. Accepted only when `tone` is `custom`; the other tones draw their own color.
  - `children`: Block[] (max 10000)

## CodeBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "code"
  - `language`?: string (maxLength 256)
  - `text`: string (maxLength 100000)

## Document
A document of a resource. `type` is `page`, `board`, `map`, `time` or `blank`. A new resource's first document is `blank`. The first write of page blocks, board records, map features or timeline lanes to a `blank` document converts it to a `page`, `board`, `map` or `time` document and keeps its name, as picking a type for a blank document in the app does; a write that is refused or changes nothing…
  - `id`: string
  - `name`: string
  - `type`: "blank" | "page" | "board" | "map" | "time"
  - `rank`: string
  - `isHidden`: boolean
  - `isFullWidth`?: boolean
  - `deletedAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.
  - `createdAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.
  - `updatedAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.
  - `calendarId`?: string — On a timeline (`time`) document, the id of the calendar its dates render in, as listed by listCalendars. Absent when the timeline has no calendar assigned; it t…
  - `mapImage`?: MapImage | null
  - `sources`?: TimelineSource[] — On a timeline (`time`) document, the timelines it chains, in order; empty when it chains none. A reference to a timeline the caller cannot read, because its res…

## DocumentBlocks
  - `id`: string
  - `version`: string
  - `schema`: 1 — Block model version.
  - `text`: string — Plain text of the document, one line per text-bearing block. A mention reads as its label, or else its resource's name.
  - `blocks`: Block[] (max 10000)

## DocumentBlocksWrite
Whole-document replacement. `unsupported` blocks are preserved only when echoed by id.
  - `blocks`: Block[] (max 10000) — The whole new tree. A block without an id is given a new id; a requested id is kept. The same block id twice answers 400 VALIDATION_ERROR at the second occurren…

## DocumentCreateParams
  - `name`: string (minLength 1, maxLength 500)
  - `type`: "blank" | "page" | "board" | "map" | "time"
  - `isHidden`?: boolean — Defaults to false.
  - `isFullWidth`?: boolean — Defaults to false.
  - `calendarId`?: string (minLength 1, maxLength 100) — The id of a calendar from listCalendars, custom or built-in, that a timeline (`time`) document's dates render in. An id that names no calendar in the project, o…

## DocumentList
  - `data`: Document[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## DocumentUpdateParams
  - `name`?: string (minLength 1, maxLength 500)
  - `rank`?: string (maxLength 65536)
  - `isHidden`?: boolean
  - `isFullWidth`?: boolean
  - `calendarId`?: string (minLength 1, maxLength 100) — The id of a calendar from listCalendars, custom or built-in, that a timeline (`time`) document's dates render in. An id that names no calendar in the project, o…
  - `mapImage`?: MapImageParams — The image asset to show as a map document's image. It sets or replaces the image, as "Add map" and "Replace map" do in the app. The map's coordinate frame follo…
  - `sources`?: TimelineSource[] (max 100) — The timelines this timeline (`time`) document chains, in order. `sources` replaces the timelines a timeline (`time`) document chains, as adding and removing tim…

## EmbedBlock
An embedded player; the URL must belong to `provider` and may be on any host the provider uses. A `data:` or `blob:` URI answers 400 VALIDATION_ERROR naming the field: documents hold no inline image data. Upload the image (createImageUpload, createImageAsset) and reference its URL. Carries `title`, the label above the block, and `isTitleHidden`, which hides that label and the frame around the bloc…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "embed"
  - `provider`: "youtube" | "spotify" | "soundcloud"
  - `url`: string (maxLength 2048)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.

## EmbedProperty
An embedded player property. A `data:` or `blob:` URI answers 400 VALIDATION_ERROR naming the field: documents hold no inline image data. Upload the image (createImageUpload, createImageAsset) and reference its URL.
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "embed"
  - `provider`: "youtube" | "spotify" | "soundcloud"
  - `url`: string (maxLength 2048)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean

## Error
The body of every 4xx and 5xx response.
  - `message`: string — Human-readable. Stable in meaning, not in wording.
  - `code`: ErrorCode — The closed set of error codes. Each code has one status; the Errors section lists them.
  - `requestId`: string — The same value as the `x-request-id` response header. Quote it when reporting a problem.
  - `errors`?: { path: string, message: string }[] — On 400 responses only: one entry per failing field or block; path is dotted (`block.children[0].level`). A `KIND_MISMATCH` response carries no `errors`.

## ErrorCode
The closed set of error codes. Each code has one status; the Errors section lists them.
- "VALIDATION_ERROR" | "INVALID_CONTENT" | "UNSUPPORTED_KIND" | "KIND_MISMATCH" | "UNAUTHENTICATED" | "SUBSCRIPTION_LAPSED" | "PAID_PLAN_REQUIRED" | "FORBIDDEN" | "WRONG_PROJECT" | "INSUFFICIENT_SCOPE" | "FEATURE_UNAVAILABLE" | "NOT_FOUND" | "METHOD_NOT_ALLOWED" | "DUPLICATE_ID" | "AMBIGUOUS" | "ALREADY_DELETED" | "HAS_CHILDREN" | "NOT_DELETED" | "PARENT_DELETED" | "IN_PROGRESS" | "IDEMPOTENCY_KEY_REUSED" | "TOO_MANY_PENDING_INVITES" | "VERSION_MISMATCH" | "DOCUMENT_TOO_LARGE" | "PAYLOAD_TOO_LARGE" | "STORAGE_QUOTA_EXCEEDED" | "RATE_LIMITED" | "UPLOAD_RATE_EXCEEDED" | "INTERNAL"

## Event
  - `id`: string
  - `laneId`: string
  - `rank`?: string — Fractional index for ordering within a lane
  - `type`: "event" | "note" | "placeholder" | "invisible-placeholder"
  - `start`: number — Start date in minutes
  - `end`?: number
  - `formattedStart`?: string — The start date as the app displays it in the document's calendar, at `detail`.
  - `formattedEnd`?: string — The end date as the app displays it, when the event has an end.
  - `startDate`: EventDate — The start date resolved in the document's calendar.
  - `endDate`?: EventDate & any
  - `detail`?: number — The precision of the dates: 1=year 2=month 3=day 4=time. Absent means day.
  - `name`?: string
  - `uri`?: string — Link to a resource or document in this project: `lk://resources/<resourceId>`, `lk://documents/<documentId>` or `lk://resources/<resourceId>/docs/<documentId>`.
  - `iconGlyph`?: string
  - `color`?: string — Fill color of the event on the timeline and the calendar, usually `#RRGGBB`. Ignored while the event's lane sets `style.color`. Absent, `#0079CC`.
  - `imageUrl`?: string
  - `isHidden`?: boolean
  - `showOnCalendar`?: boolean

## EventCreateParams
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Identifiers.
  - `laneId`: string (maxLength 256) — ID of the lane this event belongs to
  - `type`: "event" | "note" — "event" (point/range) or "note" (annotation)
  - `name`?: string (maxLength 500)
  - `start`?: number — Start in minutes. Required unless formattedStart is set.
  - `end`?: number
  - `formattedStart`?: string (maxLength 256) — Human date, fuzzy-parsed with the document calendar and converted to `start` and `detail`.
  - `formattedEnd`?: string (maxLength 256) — Human date, fuzzy-parsed with the document calendar and converted to `end`.
  - `detail`?: number — 1=year 2=month 3=day 4=time
  - `uri`?: string (maxLength 2048) — Link to a resource or document in this project. Accepted forms: `lk://resources/<resourceId>`, `lk://documents/<documentId>` or `lk://resources/<resourceId>/doc…
  - `iconGlyph`?: string (maxLength 128)
  - `color`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Fill color of the event on the timeline and the calendar, as `#RRGGBB`. Ignored while the event's lane sets `style.color`. Absent, `#0079CC`.
  - `imageUrl`?: string (maxLength 2048) — Event image URL. The URL is the `url` of an image asset of this project (upload with createImageUpload and createImageAsset). Any other URL, including an image …
  - `isHidden`?: boolean
  - `showOnCalendar`?: boolean

## EventDate
The start date resolved in the document's calendar.
  - `year`: integer — The year counted within `era`, as the app displays it; always 0 or more. A date before the first positive era is counted backwards in the negative era (44 with …
  - `month`: integer — The month number within the year, 1 for the first month of the calendar.
  - `monthName`: string
  - `day`: integer — The day of the month, 1 for the first day.
  - `hour`: integer
  - `minute`: integer
  - `era`: EventDateEra — The era a date falls in, as defined by the calendar.
  - `iso`?: string — Present only when the document uses the Gregorian calendar (`gregorian`). An ISO 8601 calendar date cut to `detail`: `YYYY`, `YYYY-MM`, `YYYY-MM-DD` or `YYYY-MM…

## EventDateEra
The era a date falls in, as defined by the calendar.
  - `id`: string
  - `name`: string
  - `abbr`: string

## EventList
  - `data`: Event[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## EventUpdateParams
  - `laneId`?: string (maxLength 256) — Move event to a different lane
  - `name`?: string (maxLength 500)
  - `start`?: number
  - `end`?: number
  - `formattedStart`?: string (maxLength 256) — Human date, fuzzy-parsed with the document calendar and converted to `start` and `detail`.
  - `formattedEnd`?: string (maxLength 256) — Human date, fuzzy-parsed with the document calendar and converted to `end`.
  - `detail`?: number
  - `uri`?: string (maxLength 2048) — Link to a resource or document in this project. Accepted forms: `lk://resources/<resourceId>`, `lk://documents/<documentId>` or `lk://resources/<resourceId>/doc…
  - `iconGlyph`?: string (maxLength 128)
  - `color`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Fill color of the event on the timeline and the calendar, as `#RRGGBB`. Ignored while the event's lane sets `style.color`. Absent, `#0079CC`.
  - `imageUrl`?: string (maxLength 2048) — Event image URL. The URL is the `url` of an image asset of this project (upload with createImageUpload and createImageAsset). Any other URL, including an image …
  - `isHidden`?: boolean
  - `showOnCalendar`?: boolean

## ExpandBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "expand"
  - `title`: string (maxLength 2048)
  - `children`: Block[] (max 10000)

## Feature
A feature of a map document. A pin carries its icon in `iconGlyph`, `iconColor`, `iconShape` and `iconSize`. `iconSize` is absent when `iconShape` is `none`, and both are absent when no shape is stored; the app then draws a medium `pin`. A shape stored by the app in an older format reads as the app draws it: a glyph-only shape reads as `none`, and any other shape outside these values reads as `pin…
  - `id`: string
  - `name`?: string
  - `type`?: "pin" | "label" | "region" | "path" | "folder"
  - `pos`?: any[] (min 2, max 2) — [lat, lng] coordinate
  - `uri`?: string — Link to a resource or document in this project: `lk://resources/<resourceId>`, `lk://documents/<documentId>` or `lk://resources/<resourceId>/docs/<documentId>`.
  - `parentId`?: string
  - `rank`?: string — Fractional index ordering the feature among its siblings under `parentId`.
  - `iconGlyph`?: string
  - `iconColor`?: string — For a `pin`: fill color of the pin shape, usually `#RRGGBB`. Absent, the pin is drawn `#A7A7A7`.
  - `iconShape`?: "pin" | "diamond" | "flag" | "marker" | "shield" | "circle" | "banner" | "arch" | "none" — The shape drawn behind the glyph on a map pin, or `none` for the glyph alone.
  - `iconSize`?: "medium" | "small" — The size of the pin shape. Absent when `iconShape` is `none`.
  - `pinImage`?: FeatureImage
  - `isHidden`?: boolean
  - `polygon`?: any[] (min 2, max 2)[]
  - `polygons`?: any[] (min 2, max 2)[][]
  - `polyline`?: any[] (min 2, max 2)[]
  - `color`?: string — For a `region`: fill and border color. For a `path`: line color. Usually `#RRGGBB`. Absent, the app draws `#3B82F6`.
  - `fillOpacity`?: number
  - `fillStyle`?: "solid" | "striped" | "dotted" | "none"
  - `borderStyle`?: "solid" | "dashed" | "dotted" | "none"
  - `strokeWidth`?: number
  - `strokeStyle`?: "solid" | "dashed" | "dotted" | "none"
  - `strokeOpacity`?: number
  - `labelVisibility`?: "always" | "hover" | "never"
  - `labelSize`?: string — Size of the name text. Written as `xs` to `3xl`; features drawn in the app may hold `small`, `medium` or `large`.
  - `textColor`?: string — Color of the name text of a `label`, `region` or `path`, usually `#RRGGBB`. Absent, `#FFFFFF`.
  - `textEffect`?: "outline" | "background" — How `textEffectColor` is drawn behind the name text of a `label`, `region` or `path`: `outline` draws a 3-pixel outline around the letters, `background` draws a…
  - `textEffectColor`?: string — Color of the outline or background box set by `textEffect`, usually `#RRGGBB`. Absent, `#000000`.
  - `updatedAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.

## FeatureCreateParams
A color field sent on a feature type it does not apply to answers 400 VALIDATION_ERROR.
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Identifiers.
  - `name`?: string (maxLength 500)
  - `type`?: "pin" | "label" | "region" | "path" | "folder" — Feature type
  - `pos`?: any[] (min 2, max 2) — Position as [lat, lng] coordinate. Optional for folders.
  - `uri`?: string (maxLength 2048) — Link to a resource or document in this project. Accepted forms: `lk://resources/<resourceId>`, `lk://documents/<documentId>` or `lk://resources/<resourceId>/doc…
  - `parentId`?: string (maxLength 256) — Parent feature ID for hierarchy (null = root). Nests the feature under a folder.
  - `rank`?: string (maxLength 65536) — Fractional index for ordering within the parent (e.g. "a0")
  - `iconGlyph`?: string (maxLength 128) — For a `pin`: a FontAwesome icon name.
  - `pinImage`?: FeatureImage
  - `isHidden`?: boolean
  - `polygon`?: any[] (min 2, max 2)[] (max 10000) — Polygon vertices (for regions)
  - `polygons`?: any[] (min 2, max 2)[] (max 10000)[] (max 100) — Several polygons of vertices (for regions)
  - `fillOpacity`?: number — Fill opacity (for regions)
  - `labelVisibility`?: "always" | "hover" | "never"
  - `borderStyle`?: "solid" | "dashed" | "dotted" | "none" — Border line style (for regions)
  - `fillStyle`?: "solid" | "striped" | "dotted" | "none" — Fill style (for regions)
  - `polyline`?: any[] (min 2, max 2)[] (max 10000) — Polyline vertices (for paths)
  - `strokeWidth`?: number — Line width (for paths)
  - `strokeStyle`?: "solid" | "dashed" | "dotted" | "none" — Line style (for paths)
  - `strokeOpacity`?: number — Line opacity (for paths)
  - `labelSize`?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
  - `visibilityRange`?: any[] (min 2, max 2) — Zoom range [min, max] as 0-1
  - `iconShape`?: "pin" | "diamond" | "flag" | "marker" | "shield" | "circle" | "banner" | "arch" | "none" — The shape drawn behind the glyph on a map pin: `pin`, `diamond`, `flag`, `marker`, `shield`, `circle`, `banner` or `arch`, or `none` for the glyph alone. Any ot…
  - `iconSize`?: "medium" | "small" — The size of the pin shape: `medium` or `small`. Ignored when `iconShape` is `none`. Any other value answers 400 VALIDATION_ERROR at the field. Sent without `ico…
  - `iconColor`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — For a `pin`: fill color of the pin shape, as `#RRGGBB`; the glyph is drawn black or white for contrast. No effect when `iconShape` is `none` or the pin has a `p…
  - `color`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — For a `region`: fill and border color. For a `path`: line color. `#RRGGBB`. Not accepted on other types. Absent, the app draws `#3B82F6`.
  - `textColor`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Color of the feature's name text: the text of a `label`, or the name label drawn on a `region` or `path`. `#RRGGBB`. Not accepted on other types. Absent, the te…
  - `textEffect`?: "outline" | "background" — How `textEffectColor` is drawn behind the name text of a `label`, `region` or `path`: `outline` draws a 3-pixel outline around the letters, `background` draws a…
  - `textEffectColor`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Color of the outline or background box set by `textEffect`, as `#RRGGBB`. Not accepted on other types. Absent, `#000000`.

## FeatureImage
  - `url`: string (maxLength 2048) — Image URL. The URL is the `url` of an image asset of this project (upload with createImageUpload and createImageAsset). Any other URL, including an image asset …
  - `height`: number
  - `width`: number

## FeatureList
  - `data`: Feature[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## FeatureUpdateParams
A color field sent on a feature type it does not apply to answers 400 VALIDATION_ERROR.
  - `name`?: string (maxLength 500)
  - `type`?: "pin" | "label" | "region" | "path" | "folder" — Feature type
  - `pos`?: any[] (min 2, max 2) — Position as [lat, lng] coordinate. Optional for folders.
  - `uri`?: string (maxLength 2048) — Link to a resource or document in this project. Accepted forms: `lk://resources/<resourceId>`, `lk://documents/<documentId>` or `lk://resources/<resourceId>/doc…
  - `parentId`?: string (maxLength 256) — Parent feature ID for hierarchy (null = root). Nests the feature under a folder.
  - `rank`?: string (maxLength 65536) — Fractional index for ordering within the parent (e.g. "a0")
  - `iconGlyph`?: string (maxLength 128) — For a `pin`: a FontAwesome icon name.
  - `pinImage`?: FeatureImage
  - `isHidden`?: boolean
  - `polygon`?: any[] (min 2, max 2)[] (max 10000) — Polygon vertices (for regions)
  - `polygons`?: any[] (min 2, max 2)[] (max 10000)[] (max 100) — Several polygons of vertices (for regions)
  - `fillOpacity`?: number — Fill opacity (for regions)
  - `labelVisibility`?: "always" | "hover" | "never"
  - `borderStyle`?: "solid" | "dashed" | "dotted" | "none" — Border line style (for regions)
  - `fillStyle`?: "solid" | "striped" | "dotted" | "none" — Fill style (for regions)
  - `polyline`?: any[] (min 2, max 2)[] (max 10000) — Polyline vertices (for paths)
  - `strokeWidth`?: number — Line width (for paths)
  - `strokeStyle`?: "solid" | "dashed" | "dotted" | "none" — Line style (for paths)
  - `strokeOpacity`?: number — Line opacity (for paths)
  - `labelSize`?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
  - `visibilityRange`?: any[] (min 2, max 2) — Zoom range [min, max] as 0-1
  - `iconShape`?: "pin" | "diamond" | "flag" | "marker" | "shield" | "circle" | "banner" | "arch" | "none" — The shape drawn behind the glyph on a map pin: `pin`, `diamond`, `flag`, `marker`, `shield`, `circle`, `banner` or `arch`, or `none` for the glyph alone. Any ot…
  - `iconSize`?: "medium" | "small" — The size of the pin shape: `medium` or `small`. Ignored when `iconShape` is `none`. Any other value answers 400 VALIDATION_ERROR at the field. Sent without `ico…
  - `iconColor`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — For a `pin`: fill color of the pin shape, as `#RRGGBB`; the glyph is drawn black or white for contrast. No effect when `iconShape` is `none` or the pin has a `p…
  - `color`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — For a `region`: fill and border color. For a `path`: line color. `#RRGGBB`. Not accepted on other types. Absent, the app draws `#3B82F6`.
  - `textColor`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Color of the feature's name text: the text of a `label`, or the name label drawn on a `region` or `path`. `#RRGGBB`. Not accepted on other types. Absent, the te…
  - `textEffect`?: "outline" | "background" — How `textEffectColor` is drawn behind the name text of a `label`, `region` or `path`: `outline` draws a 3-pixel outline around the letters, `background` draws a…
  - `textEffectColor`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Color of the outline or background box set by `textEffect`, as `#RRGGBB`. Not accepted on other types. Absent, `#000000`.

## FilterPredicate
A collection filter. `composite` combines `filters` with `and`, `or` or `not`. Nesting through `children`, `rows` and filter `filters` is limited to 64 levels; deeper input answers 400 VALIDATION_ERROR.
  - one of: { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "field", field: string (maxLength 256), operator: "equals" | "not_equals" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal" | "contains" | "starts_with" | "ends_with" | "regex" | "in" | "not_in", value?: string (maxLength 100000) | number | boolean | null | (string (maxLength 100000) | number | boolean | null | null)[] (max 1000) | null } | { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "id", operator: "in" | "not_in", ids: (string (maxLength 256) | number)[] (max 1000) } | { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "tag", operator: "has_all" | "has_any" | "has_none", tags: string (maxLength 100)[] (max 1000) } | { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "custom", predicate: string (maxLength 256), params?: Record<string, string (maxLength 100000) | number | boolean | null | (string (maxLength 100000) | number | boolean | null | null)[] (max 1000) | null> } | { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "date_range", field: string (maxLength 256), start?: number, end?: number } | { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "property", propertyType?: string (maxLength 256), key?: string (maxLength 256), field?: "textValue" | "numValue" | "meterCurrent" | "meterMax", operator: "equals" | "not_equals" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal" | "contains" | "starts_with" | "ends_with" | "regex" | "in" | "not_in", value?: string (maxLength 100000) | number | boolean | null | (string (maxLength 100000) | number | boolean | null | null)[] (max 1000) | null } | { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "mention", targetId: string (maxLength 256), propertyType?: string (maxLength 256), key?: string (maxLength 256) } | { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "text", operator: "contains", value: string (maxLength 100000) } | { type: "filter", id: string (maxLength 256), scope?: string (maxLength 256), filterType: "composite", operator: "and" | "or" | "not", filters: FilterPredicate[] (max 1000) }

## HeadingBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "heading"
  - `level`: integer (minimum 1, maximum 6)
  - `content`: Run[] (max 10000)

## ImageAssetCreateParams
  - `uploadKey`: string (minLength 1, maxLength 512) — The `uploadKey` from createImageUpload in this project. A key from another project, or one with no image stored under it, answers 400 VALIDATION_ERROR.
  - `name`: string (minLength 1, maxLength 200) — Asset name, 1–200 characters.
  - `description`?: string (maxLength 10000) — Asset description, stored on the asset and returned by getAsset. Omitted, the asset has no description.
  - `folderId`?: string (maxLength 256) — Folder to place the asset in (root if omitted). It must be the id of a FOLDER asset in this project; any other id answers 400 VALIDATION_ERROR at `folderId`.

## ImageBlock
An image by `url`. The URL is the `url` of an image asset of this project (upload with createImageUpload and createImageAsset). Any other URL, including an image asset of another project, answers 400 VALIDATION_ERROR naming the field, unless the same document, resource or board already holds that URL in an image field. A `data:` or `blob:` URI answers 400 VALIDATION_ERROR naming the field: documen…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "image"
  - `url`: string (maxLength 2048)
  - `alt`?: string (maxLength 500)
  - `fill`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.

## ImageProperty
An image property by `url`. The URL is the `url` of an image asset of this project (upload with createImageUpload and createImageAsset). Any other URL, including an image asset of another project, answers 400 VALIDATION_ERROR naming the field, unless the same document, resource or board already holds that URL in an image field. A `data:` or `blob:` URI answers 400 VALIDATION_ERROR naming the field…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "image"
  - `url`: string (maxLength 2048)
  - `alt`?: string (maxLength 500)
  - `fill`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean

## ImageUpload
  - `uploadKey`: string — Opaque key naming the upload. Pass it to createImageAsset once the upload succeeds.
  - `uploadUrl`: string — The signed storage URL to send the file to.
  - `method`: "PUT" — The HTTP method for the upload.
  - `headers`: Record<string, string> — Headers the upload must send, exactly as given.
  - `expiresAt`: string — ISO-8601 time after which `uploadUrl` is refused.

## ImageUploadCreateParams
  - `contentType`: "image/jpeg" | "image/jpg" | "image/png" | "image/gif" | "image/webp" — The MIME type of the image. The upload must send it as `content-type`.
  - `contentLength`: integer — The size of the file in bytes, charged against the storage quota and the daily upload budget. The upload body must be exactly this many bytes. A size past the p…
  - `contentHash`?: string (minLength 64, maxLength 64, pattern ^[a-f0-9]{64}$) — Optional lowercase hex SHA-256 of the file. When sent, storage rejects an upload whose bytes do not match it.

## InfoboxBlock
An infobox whose `rows` are properties. Carries `layout` and `width`. A new one written without them is `wrapRight` at `width` 40, the shape the editor gives a new infobox; on a replace or an update an omitted field keeps the value the block already has.
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "infobox"
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `rows`: PropertyBlock[] (max 256)

## Invite
  - `id`: string
  - `email`?: string | null
  - `role`?: "ADMIN" | "MEMBER"
  - `createdAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.
  - `expiresAt`?: string (pattern Z$, format date-time) | null (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.

## InviteList
  - `data`: Invite[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## InviteResult
  - `success`: boolean
  - `alreadyMember`?: boolean — `true` when the address belongs to a member of the project.
  - `alreadyInvited`?: boolean — `true` when the address has a pending invite.

## JsonValue
Any JSON value: a string of up to 100,000 characters, a number, a boolean, null, an array of up to 256 values, or an object of up to 256 keys of up to 256 characters. Arrays and objects nest at most 8 levels.
  - one of: string (maxLength 100000) | number | boolean | null | JsonValue[] (max 256) | Record<string, JsonValue>

## KeyValueBlock
Key-value rows drawn in the `display` variant. A row value is `content` (runs) or `text` (a plain string); `content` wins when both are sent and `text` is always returned alongside `content`. A leading or trailing `{ break: true }` run in a row value is trimmed. Carries `title`, the label above the block, and `isTitleHidden`, which hides that label and the frame around the block. A new one written…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "keyValue"
  - `display`?: "list" | "grid" | "inline"
  - `rows`: ({ id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), key: string (maxLength 2048), content?: (object | object | object)[] (max 10000), text?: string (maxLength 100000) })[] (max 256)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.

## KeyValueProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "keyValue"
  - `display`?: "list" | "grid" | "inline"
  - `rows`: ({ id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), key: string (maxLength 2048), content?: (object | object | object)[] (max 10000), text?: string (maxLength 100000) })[] (max 256)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean

## Lane
  - `id`: string
  - `name`: string
  - `rank`: string — Fractional index for ordering (e.g. "a0", "a1")
  - `size`: "sm" | "lg"
  - `style`?: { color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$), imageUrl?: string (maxLength 2048), opacity?: number } — Lane visual style options

## LaneCreateParams
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Identifiers.
  - `name`: string (maxLength 500) — Lane display name
  - `rank`: string (maxLength 65536) — Fractional index for ordering (e.g. "a0", "a1")
  - `size`: "sm" | "lg" — Lane height
  - `style`?: { color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$), imageUrl?: string (maxLength 2048), opacity?: number } — Lane visual style options

## LaneList
  - `data`: Lane[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## LaneUpdateParams
  - `name`?: string (maxLength 500)
  - `rank`?: string (maxLength 65536)
  - `size`?: "sm" | "lg"
  - `style`?: { color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$), imageUrl?: string (maxLength 2048), opacity?: number } — Lane visual style options

## LayoutBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "layout"
  - `children`: Block[] (max 10000)

## LayoutColumnBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "layoutColumn"
  - `width`?: number (minimum 0, maximum 100)
  - `children`: Block[] (max 10000)

## ListItemBlock
The first child must be a paragraph; nested bulletList and orderedList blocks follow it.
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "listItem"
  - `children`: Block[] (max 10000)

## ListedDocument
A document as listed on a ResourceListItem.
  - `id`: string
  - `name`: string | null
  - `type`: string | null — The document type, as on Document: `page`, `board`, `map`, `time` or `blank`.

## MapBlock
An interactive map. `resourceId` and `documentId` name a `map` document of this project that the caller can read. A resource or document that does not exist, is deleted, is hidden from the caller, belongs to another project or is not a `map` document answers 400 VALIDATION_ERROR naming the field, unless the same document or resource already holds that map. Name both ids or neither; a map with neit…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "map"
  - `resourceId`?: string (minLength 1, maxLength 256)
  - `documentId`?: string (minLength 1, maxLength 256)
  - `viewport`?: MapViewport — The view a map opens at: `center` as `[lat, lng]` in the map's coordinate frame, the frame of a feature's `pos`, and the Leaflet `zoom` level.
  - `displayHeight`?: number (minimum 150, maximum 800)
  - `fill`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.

## MapImage
The image of a map document and its coordinate frame. Feature `pos` values are `[lat, lng]` in this frame, the frame the app uses when a feature is placed by clicking the map. A pixel `(x, y)` of the image, counted in pixels from its top-left corner, is at `pos = [north - y * (north - south) / height, west + x * (east - west) / width]`, which is `[-y / 2^z, x / 2^z]` with `z = ceil(log2(max(width,…
  - `assetId`: string | null — The image asset in the project's library whose `url` is the map's image. null when no image asset readable by the caller has that url: the asset was deleted, it…
  - `url`: string | null — The URL of the map's image. null for a legacy tiled map, which has no single image file.
  - `width`: integer — The image width in pixels.
  - `height`: integer — The image height in pixels.
  - `bounds`: any[] (min 2, max 2) — `[[south, west], [north, east]]`, the `[lat, lng]` corners the image covers. `north` and `west` are 0 at the image's top-left corner; `south` is negative and `e…

## MapImageParams
The image asset to show as a map document's image. It sets or replaces the image, as "Add map" and "Replace map" do in the app. The map's coordinate frame follows from the image's pixel size; the response's `mapImage` carries it (see MapImage). Features keep their `pos`: after a replacement with an image of another size, a feature sits over a different pixel of the new image. The app draws the ima…
  - `assetId`: string (minLength 1, maxLength 256) — An image asset in the project's library that the caller can read. An `assetId` that is not an asset of this project, is not an image, or is hidden from a caller…

## MapProperty
An interactive map property. `resourceId` and `documentId` name a `map` document of this project that the caller can read. A resource or document that does not exist, is deleted, is hidden from the caller, belongs to another project or is not a `map` document answers 400 VALIDATION_ERROR naming the field, unless the same document or resource already holds that map. Name both ids or neither; a map …
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "map"
  - `resourceId`?: string (minLength 1, maxLength 256)
  - `documentId`?: string (minLength 1, maxLength 256)
  - `viewport`?: MapViewport — The view a map opens at: `center` as `[lat, lng]` in the map's coordinate frame, the frame of a feature's `pos`, and the Leaflet `zoom` level.
  - `displayHeight`?: number (minimum 150, maximum 800)
  - `fill`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean

## MapViewport
The view a map opens at: `center` as `[lat, lng]` in the map's coordinate frame, the frame of a feature's `pos`, and the Leaflet `zoom` level.
  - `center`: any[] (min 2, max 2)
  - `zoom`: number

## Member
  - `id`: string — User ID
  - `name`?: string | null
  - `email`?: string | null — The member's email address. null unless the caller has the ADMIN role.
  - `role`?: "ADMIN" | "MEMBER" | "OWNER"
  - `image`?: string | null

## MemberInviteParams
  - `email`: string (maxLength 254, format email) — Email address to invite.

## MemberList
  - `data`: Member[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## MeterBlock
Tracked values drawn in `mode`. Carries `title`, the label above the block, and `isTitleHidden`, which hides that label and the frame around the block. A new one written without them reads `title: "Meter"` and `isTitleHidden: false`; on a replace or an update an omitted `title` keeps the value the block already has. A block the app stored without `isTitleHidden` reads `isTitleHidden: true`, as the…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "meter"
  - `mode`: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating"
  - `items`: ({ id?: string (minLength 1, maxLength 256), name: string (maxLength 2048), icon: string (maxLength 256), ratingIcon?: string (maxLength 256), current: number (minimum 0), max: number (minimum 1), color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) | "none" })[] (max 256)
  - `showText`?: boolean
  - `showIcon`?: boolean
  - `showMax`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.

## MeterProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "meter"
  - `mode`: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating"
  - `items`: ({ id?: string (minLength 1, maxLength 256), name: string (maxLength 2048), icon: string (maxLength 256), ratingIcon?: string (maxLength 256), current: number (minimum 0), max: number (minimum 1), color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) | "none" })[] (max 256)
  - `showText`?: boolean
  - `showIcon`?: boolean
  - `showMax`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean

## OrderedListBlock
An ordered list. `start` is the first number; `start: 1` is the default and is omitted on read.
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "orderedList"
  - `start`?: integer (minimum 0)
  - `children`: Block[] (max 10000)

## ParagraphBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "paragraph"
  - `content`: Run[] (max 10000)

## Project
  - `id`: string
  - `name`?: string
  - `isPublic`?: boolean
  - `createdAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.

## ProjectList
  - `data`: Project[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## PropertyBlock
A sidebar or infobox property: a structured block kind plus the property envelope (`rank`, `title`, `isTitleHidden`, `isHidden`). A property the public model cannot express reads as `kind: "unsupported"` with its id and envelope. A property is laid out by the infobox or sidebar that holds it, so it carries neither `layout` nor `width`. Nesting through `children`, `rows` and filter `filters` is lim…
  - one of: TextFieldProperty | KeyValueProperty | ImageProperty | MeterProperty | ResourceCollectionProperty | ResourceLinkProperty | EmbedProperty | MapProperty | UnsupportedProperty

## PropertyCreateRequest
A property to create: `kind` plus that kind's fields, an optional `id`, the envelope fields `title`, `isTitleHidden` and `isHidden`, and optional `before`/`after` placement (at most one; neither appends last). `rank` is set by placement and is rejected in the body with 400 VALIDATION_ERROR. `kind: "unsupported"` cannot be created and answers 400 UNSUPPORTED_KIND.
  - one of: { id?: string (minLength 1, maxLength 256), kind: "textField", title?: string (maxLength 256), isTitleHidden?: boolean, children: Block[] (max 10000), isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "keyValue", display?: "list" | "grid" | "inline", rows: object[] (max 256), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "image", url: string (maxLength 2048), alt?: string (maxLength 500), fill?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "meter", mode: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating", items: object[] (max 256), showText?: boolean, showIcon?: boolean, showMax?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "resourceCollection", items?: object[] (max 256), filter?: FilterPredicate, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "resourceLink", items: object[] (max 256), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "embed", provider: "youtube" | "spotify" | "soundcloud", url: string (maxLength 2048), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "map", resourceId?: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256), viewport?: MapViewport, displayHeight?: number (minimum 150, maximum 800), fill?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) }

## PropertyList
  - `data`: PropertyBlock[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## PropertyUpdateRequest
A partial PropertyBlock: any of the envelope fields (`rank`, `title`, `isTitleHidden`, `isHidden`) and any field of the property's own kind. The patch is merged over the current property and the result is validated as a whole, so a field of another kind answers 400 VALIDATION_ERROR. `kind` and `id` cannot be patched.
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `children`?: Block[] (max 10000)
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `display`?: "list" | "grid" | "inline"
  - `rows`?: ({ id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), key: string (maxLength 2048), content?: (object | object | object)[] (max 10000), text?: string (maxLength 100000) })[] (max 256)
  - `url`?: string (maxLength 2048)
  - `alt`?: string (maxLength 500)
  - `fill`?: boolean | boolean
  - `mode`?: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating"
  - `items`?: ({ id?: string (minLength 1, maxLength 256), name: string (maxLength 2048), icon: string (maxLength 256), ratingIcon?: string (maxLength 256), current: number (minimum 0), max: number (minimum 1), color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) | "none" })[] (max 256) | { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256) | { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `showText`?: boolean
  - `showIcon`?: boolean
  - `showMax`?: boolean
  - `filter`?: FilterPredicate — A collection filter. `composite` combines `filters` with `and`, `or` or `not`. Nesting through `children`, `rows` and filter `filters` is limited to 64 levels; …
  - `provider`?: "youtube" | "spotify" | "soundcloud"
  - `resourceId`?: string (minLength 1, maxLength 256)
  - `documentId`?: string (minLength 1, maxLength 256)
  - `viewport`?: MapViewport — The view a map opens at: `center` as `[lat, lng]` in the map's coordinate frame, the frame of a feature's `pos`, and the Leaflet `zoom` level.
  - `displayHeight`?: number (minimum 150, maximum 800)

## QuoteBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "quote"
  - `children`: Block[] (max 10000)

## Resource
A resource. `properties` are its sidebar properties as PropertyBlocks. `iconSize` is absent when `iconShape` is `none`, and both are absent when no shape is stored; the app then draws a medium `pin`. A shape stored by the app in an older format reads as the app draws it: a glyph-only shape reads as `none`, and any other shape outside these values reads as `pin` and `medium`.
  - `id`: string
  - `name`: string
  - `tags`: string[]
  - `aliases`: string[]
  - `iconGlyph`?: string
  - `iconColor`?: string — Fill color of this resource's map pins. Also tints its cards and graph nodes. Written as `#RRGGBB`; a resource from an import or an older version may hold anoth…
  - `parentId`?: string
  - `rank`: string
  - `isHidden`: boolean
  - `isLocked`?: boolean
  - `isFullWidth`?: boolean
  - `showPropertyBar`?: boolean
  - `imageUrl`?: string
  - `banner`?: { enabled: boolean, url: string, yPosition: number }
  - `permissions`: Record<string, 0 | 1 | 2 | 3 | 4 | 5>
  - `documents`: Document[]
  - `properties`: PropertyBlock[]
  - `createdAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.
  - `updatedAt`?: string (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.
  - `iconShape`?: "pin" | "diamond" | "flag" | "marker" | "shield" | "circle" | "banner" | "arch" | "none" — The shape drawn behind the glyph on a map pin, or `none` for the glyph alone.
  - `iconSize`?: "medium" | "small" — The size of the pin shape. Absent when `iconShape` is `none`.

## ResourceBatch
The created resources, in the order of the request.
  - `resources`: Resource[]

## ResourceBatchCreateParams
  - `resources`: ResourceCreateParams[] (min 1, max 100) — 1–100 resources to create, each a ResourceCreateParams, created in this order. An item may name an earlier item of the same batch as its `parentId` when that ea…

## ResourceCollectionBlock
Resources picked by `items` or selected by `filter`. Carries `title`, the label above the block, and `isTitleHidden`, which hides that label and the frame around the block. A new one written without them reads `title: "Collection"` and `isTitleHidden: false`; on a replace or an update an omitted `title` keeps the value the block already has. A block the app stored without `isTitleHidden` reads `is…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "resourceCollection"
  - `items`?: { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `filter`?: FilterPredicate — A collection filter. `composite` combines `filters` with `and`, `or` or `not`. Nesting through `children`, `rows` and filter `filters` is limited to 64 levels; …
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.

## ResourceCollectionProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "resourceCollection"
  - `items`?: { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `filter`?: FilterPredicate — A collection filter. `composite` combines `filters` with `and`, `or` or `not`. Nesting through `children`, `rows` and filter `filters` is limited to 64 levels; …
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean

## ResourceCreateParams
  - `name`: string (minLength 1, maxLength 500)
  - `parentId`?: string (maxLength 256) — The parent resource. Omitted, the resource is created at the root. `templates` creates a top-level template. An unknown or deleted id answers 404 NOT_FOUND. A c…
  - `tags`?: string (maxLength 100)[] (max 50)
  - `aliases`?: string (maxLength 256)[] (max 128)
  - `iconGlyph`?: string (maxLength 128) — FontAwesome icon name (e.g., "crown", "dog", "snowflake"). See fontawesome.com/icons for valid names. An unknown name answers 400 VALIDATION_ERROR.
  - `iconColor`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Fill color of this resource's map pins, as `#RRGGBB`. Also tints its cards and graph nodes. Defaults to `#C49454`.
  - `iconShape`?: "pin" | "diamond" | "flag" | "marker" | "shield" | "circle" | "banner" | "arch" | "none" — The shape drawn behind the glyph on a map pin: `pin`, `diamond`, `flag`, `marker`, `shield`, `circle`, `banner` or `arch`, or `none` for the glyph alone. Any ot…
  - `isHidden`?: boolean — `true` creates the resource hidden. Only a project admin may create a hidden resource; a caller who is not answers 403 FORBIDDEN.
  - `isLocked`?: boolean
  - `banner`?: { enabled: boolean, url: string (maxLength 2048), yPosition: number }
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Identifiers. A malformed i…
  - `documents`?: ResourceDocumentParams[] (min 1, max 5) — 1–5 documents, created in this order. Omitted, the resource starts with one `blank` document named `Main`, which its first typed write converts.
  - `iconSize`?: "medium" | "small" — The size of the pin shape: `medium` or `small`. Ignored when `iconShape` is `none`. Any other value answers 400 VALIDATION_ERROR at the field. Omitted while `ic…
  - `after`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly after it. Mutually exclusive with `before`.
  - `before`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly before it. Mutually exclusive with `after`.

## ResourceDocumentParams
A document of a new resource.
  - `type`?: "blank" | "page" | "board" | "map" | "time" — The document type: `page`, `board`, `map`, `time` or `blank`. Defaults to `page` when `blocks` is sent, otherwise to `blank`.
  - `name`?: string (minLength 1, maxLength 500) — The document name, 1–500 characters. Defaults to `Main`.
  - `calendarId`?: string (minLength 1, maxLength 100) — For a timeline (`time`) document, the id of a calendar from listCalendars, custom or built-in. An id that names no calendar in the project, or a `calendarId` wi…
  - `blocks`?: Block[] (max 10000) — The content of a `page` document as Blocks, validated as replaceDocumentBlocks validates them. Blocks with any other type answer 400 VALIDATION_ERROR at `docume…

## ResourceFromTemplateParams
  - `templateId`: string (maxLength 256) — The template to copy: a resource under the `templates` root, at any depth. A resource that is not a template answers 400 VALIDATION_ERROR. An unknown or deleted…
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id for the new resource: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Ident…
  - `name`?: string (minLength 1, maxLength 500) — Name of the new resource. Omitted, it is the template's name with the word `Template` removed.
  - `parentId`?: string (maxLength 256) — The parent of the new resource, as in createResource. Omitted, the resource is created at the root. An unknown or deleted id answers 404 NOT_FOUND.
  - `includeChildren`?: boolean — `true` also copies the template's descendants the caller can view, keeping their tree. Default false. A copy holds at most 100 resources; a larger template answ…
  - `after`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly after it. Mutually exclusive with `before`.
  - `before`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly before it. Mutually exclusive with `after`.

## ResourceLinkBlock
Links to resources. Carries `title`, the label above the block, and `isTitleHidden`, which hides that label and the frame around the block. A new one written without them reads `title: "Links"` and `isTitleHidden: false`; on a replace or an update an omitted `title` keeps the value the block already has. A block the app stored without `isTitleHidden` reads `isTitleHidden: true`, as the app draws i…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "resourceLink"
  - `items`: { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.

## ResourceLinkProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "resourceLink"
  - `items`: { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean

## ResourceList
  - `data`: ResourceListItem[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## ResourceListItem
A resource as listed: identity, icon, tags, aliases, rank and its documents' ids, names and types, enough to compare a page of resources with a local copy without reading each one. Read a resource by id for its properties, permissions and lock state.
  - `id`: string
  - `name`: string
  - `parentId`?: string | null
  - `iconGlyph`?: string | null
  - `iconColor`?: string | null — Fill color of this resource's map pins. Also tints its cards and graph nodes. Written as `#RRGGBB`; a resource from an import or an older version may hold anoth…
  - `tags`: string[]
  - `aliases`: string[] — Alternative names of the resource, as on getResource.
  - `rank`?: string | null
  - `isHidden`?: boolean
  - `createdAt`?: string (pattern Z$, format date-time) | null (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.
  - `updatedAt`?: string (pattern Z$, format date-time) | null (pattern Z$, format date-time) — ISO 8601 date-time in UTC, ending in `Z`.
  - `iconShape`?: "pin" | "diamond" | "flag" | "marker" | "shield" | "circle" | "banner" | "arch" | "none" — The shape drawn behind the glyph on a map pin, or `none` for the glyph alone.
  - `iconSize`?: "medium" | "small" — The size of the pin shape. Absent when `iconShape` is `none`.
  - `documents`: ListedDocument[] — The resource's documents, ordered by name. Deleted documents are left out, and so are hidden documents for a caller who is not a project admin. Read a document …

## ResourceMoveParams
  - `parentId`?: string (maxLength 256) | null (maxLength 256) — The new parent resource id, or null for the root. `templates` makes the resource a top-level template; only a project admin may name it. Omitted, the resource s…
  - `after`?: string (maxLength 256) — Id of a sibling under the destination parent. The resource is placed directly after it. Sending both `after` and `before` answers 400 VALIDATION_ERROR. An ancho…
  - `before`?: string (maxLength 256) — Id of a sibling under the destination parent. The resource is placed directly before it. Sending both `after` and `before` answers 400 VALIDATION_ERROR. An anch…

## ResourceSaveAsTemplateParams
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id for the new template: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Ident…
  - `name`?: string (minLength 1, maxLength 500) — Name of the new template. Omitted, it is the resource's name.
  - `includeChildren`?: boolean — `true` also copies the resource's descendants the caller can view, keeping their tree. Default false. A copy holds at most 100 resources; a larger tree answers …
  - `after`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly after it. Mutually exclusive with `before`.
  - `before`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly before it. Mutually exclusive with `after`.

## ResourceUpdateParams
  - `name`?: string (minLength 1, maxLength 500)
  - `tags`?: string (maxLength 100)[] (max 50)
  - `aliases`?: string (maxLength 256)[] (max 128)
  - `iconGlyph`?: string (maxLength 128) — FontAwesome icon name (e.g., "crown", "dog", "snowflake"). See fontawesome.com/icons for valid names. An unknown name answers 400 VALIDATION_ERROR.
  - `iconColor`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Fill color of this resource's map pins, as `#RRGGBB`. Also tints its cards and graph nodes.
  - `iconShape`?: "pin" | "diamond" | "flag" | "marker" | "shield" | "circle" | "banner" | "arch" | "none" — The shape drawn behind the glyph on a map pin: `pin`, `diamond`, `flag`, `marker`, `shield`, `circle`, `banner` or `arch`, or `none` for the glyph alone. Any ot…
  - `isHidden`?: boolean — Only project admins may change `isHidden`. A change by a caller who is not a project admin answers 403 FORBIDDEN.
  - `isLocked`?: boolean
  - `banner`?: { enabled: boolean, url: string (maxLength 2048), yPosition: number }
  - `permissions`?: Record<string, 0 | 1 | 2 | 3 | 4 | 5> — Access levels keyed by a role (`MEMBER`, `ADMIN` or `OWNER`) or a user id. A level is 0 No Access, 1 Can Read, 2 Can Edit, 3 Full Access, 4 defer to the role or…
  - `iconSize`?: "medium" | "small" — The size of the pin shape: `medium` or `small`. Ignored when `iconShape` is `none`. Any other value answers 400 VALIDATION_ERROR at the field. Sent without `ico…

## Row
  - `id`: string | null
  - `rank`: string
  - `key`: string
  - `content`: Run[] (max 10000)
  - `text`: string

## RowCreateRequest
  - `key`: string (maxLength 256)
  - `content`?: Run[] (max 10000) — The row value as runs. A `{ break: true }` run starts a new line; a stored line break and a paragraph boundary both read back as `break`. When both `content` an…
  - `text`?: string (maxLength 100000) — The row value as a plain string. Ignored when `content` is sent.
  - `before`?: string (maxLength 256) — Place before this row id. At most one of `before` and `after`; neither appends last.
  - `after`?: string (maxLength 256) — Place after this row id. At most one of `before` and `after`; neither appends last.

## RowList
  - `data`: Row[]
  - `version`: string

## RowPatchRequest
  - `key`?: string (maxLength 256)
  - `content`?: Run[] (max 10000) | null — The row value as runs. `null` clears the value. When both `content` and `text` are sent, `content` wins.
  - `text`?: string (maxLength 100000) — The row value as a plain string. It cannot be null.

## RuleBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "rule"

## Run
A text run with optional marks, a mention, or a line break. A run with `code: true` carries no other mark, and a run carries at most one of `sub` and `sup`. Runs are normalized on write: a run whose `text` is empty is dropped, and adjacent runs carrying identical marks are merged into one. A mention's `text` is an optional label. `name` is the resource's current name; it is read-only.
  - one of: { text: string (maxLength 100000), bold?: boolean, italic?: boolean, underline?: boolean, strike?: boolean, code?: boolean, link?: string (maxLength 2048), sub?: boolean, sup?: boolean } | { mention: object } | { break: true }

## SearchHighlight
  - `segment`: string
  - `index`: number
  - `matchStart`: number
  - `matchEnd`: number

## SearchHitDocument
Present when the match is in the content of one of the resource's documents rather than its name or aliases.
  - `id`: string
  - `name`: string
  - `highlights`?: SearchHighlight[] — The matching passage with the offsets of the first match in it.
  - `isSolo`?: boolean — True when this is the only document of the resource in the results.

## SearchHitResource
  - `id`: string
  - `name`: string
  - `iconGlyph`?: string | null
  - `iconColor`?: string | null — Fill color of this resource's map pins. Also tints its cards and graph nodes. Written as `#RRGGBB`; a resource from an import or an older version may hold anoth…
  - `iconShape`?: "pin" | "diamond" | "flag" | "marker" | "shield" | "circle" | "banner" | "arch" | "none" — The shape drawn behind the glyph on a map pin, or `none` for the glyph alone.
  - `iconSize`?: "medium" | "small" — The size of the pin shape. Absent when `iconShape` is `none`.
  - `parentId`?: string | null
  - `tags`: string[]
  - `path`?: { id: string, name: string }[] — Ancestors of the resource from the root down; absent for a root resource.

## SearchResult
  - `resource`: SearchHitResource
  - `document`?: SearchHitDocument — Present when the match is in the content of one of the resource's documents rather than its name or aliases.

## SearchResultList
  - `data`: SearchResult[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## SecretBlock
Content hidden from players and stripped from public pages. Carries `layout` and `width`. A new one written without them is full width; on a replace or an update an omitted field keeps the value the block already has.
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "secret"
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `children`: Block[] (max 10000)

## TableBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "table"
  - `children`: Block[] (max 10000)

## TableCellBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "tableCell"
  - `header`?: boolean
  - `colspan`?: integer (minimum 1)
  - `rowspan`?: integer (minimum 1)
  - `children`: Block[] (max 10000)

## TableRowBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "tableRow"
  - `children`: Block[] (max 10000)

## Tag
  - `tag`: string
  - `count`: integer — The number of resources in the project that carry the tag.

## TagList
  - `data`: Tag[]
  - `hasMore`?: boolean — True when more items exist beyond this page.
  - `nextCursor`?: string | null — Cursor for the next page, or null.

## TaskItemBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "taskItem"
  - `checked`: boolean
  - `content`: Run[] (max 10000)

## TaskListBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "taskList"
  - `children`: Block[] (max 10000)

## TextFieldBlock
A rich-text container. Carries `title`, the label above the block, and `isTitleHidden`, which hides that label and the frame around the block. A new one written without them reads `title: "Text"` and `isTitleHidden: false`; on a replace or an update an omitted `title` keeps the value the block already has. A block the app stored without `isTitleHidden` reads `isTitleHidden: true`, as the app draws…
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "textField"
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `children`: Block[] (max 10000)

## TextFieldProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "textField"
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `children`: Block[] (max 10000)
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean

## TimelineSource
A timeline (`time`) document that another timeline chains as a source. listLanes and listEvents on the chaining timeline include the lanes and events of its sources, and of their sources in turn.
  - `resourceId`: string (minLength 1, maxLength 256) — The resource that holds the source timeline.
  - `documentId`: string (minLength 1, maxLength 256) — The source timeline document.

## UnsupportedBlock
  - `kind`: "unsupported"
  - `id`: string (minLength 1, maxLength 256)

## UnsupportedProperty
  - `kind`: "unsupported"
  - `id`: string (minLength 1, maxLength 256)
  - `rank`?: string (minLength 1, maxLength 65536)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `isHidden`?: boolean

## VersionedBlock
A Block plus the document `version` it was read or written at.
  - one of: VersionedParagraphBlock | VersionedHeadingBlock | VersionedQuoteBlock | VersionedCodeBlock | VersionedRuleBlock | VersionedBulletListBlock | VersionedOrderedListBlock | VersionedListItemBlock | VersionedTaskListBlock | VersionedTaskItemBlock | VersionedTableBlock | VersionedTableRowBlock | VersionedTableCellBlock | VersionedCalloutBlock | VersionedExpandBlock | VersionedLayoutBlock | VersionedLayoutColumnBlock | VersionedImageBlock | VersionedEmbedBlock | VersionedKeyValueBlock | VersionedInfoboxBlock | VersionedMeterBlock | VersionedResourceCollectionBlock | VersionedResourceLinkBlock | VersionedMapBlock | VersionedSecretBlock | VersionedTextFieldBlock | VersionedUnsupportedBlock

## VersionedBulletListBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "bulletList"
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedCalloutBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "callout"
  - `tone`: "info" | "note" | "success" | "warning" | "error" | "custom"
  - `icon`?: string (maxLength 256)
  - `color`?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) — Icon color and background tint, as `#RRGGBB`. Accepted only when `tone` is `custom`; the other tones draw their own color.
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedCodeBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "code"
  - `language`?: string (maxLength 256)
  - `text`: string (maxLength 100000)
  - `version`: string

## VersionedEmbedBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "embed"
  - `provider`: "youtube" | "spotify" | "soundcloud"
  - `url`: string (maxLength 2048)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `version`: string

## VersionedEmbedProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "embed"
  - `provider`: "youtube" | "spotify" | "soundcloud"
  - `url`: string (maxLength 2048)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `version`: string

## VersionedExpandBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "expand"
  - `title`: string (maxLength 2048)
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedHeadingBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "heading"
  - `level`: integer (minimum 1, maximum 6)
  - `content`: Run[] (max 10000)
  - `version`: string

## VersionedImageBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "image"
  - `url`: string (maxLength 2048)
  - `alt`?: string (maxLength 500)
  - `fill`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `version`: string

## VersionedImageProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "image"
  - `url`: string (maxLength 2048)
  - `alt`?: string (maxLength 500)
  - `fill`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `version`: string

## VersionedInfoboxBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "infobox"
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `rows`: PropertyBlock[] (max 256)
  - `version`: string

## VersionedKeyValueBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "keyValue"
  - `display`?: "list" | "grid" | "inline"
  - `rows`: ({ id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), key: string (maxLength 2048), content?: (object | object | object)[] (max 10000), text?: string (maxLength 100000) })[] (max 256)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `version`: string

## VersionedKeyValueProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "keyValue"
  - `display`?: "list" | "grid" | "inline"
  - `rows`: ({ id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), key: string (maxLength 2048), content?: (object | object | object)[] (max 10000), text?: string (maxLength 100000) })[] (max 256)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `version`: string

## VersionedLayoutBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "layout"
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedLayoutColumnBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "layoutColumn"
  - `width`?: number (minimum 0, maximum 100)
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedListItemBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "listItem"
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedMapBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "map"
  - `resourceId`?: string (minLength 1, maxLength 256)
  - `documentId`?: string (minLength 1, maxLength 256)
  - `viewport`?: MapViewport — The view a map opens at: `center` as `[lat, lng]` in the map's coordinate frame, the frame of a feature's `pos`, and the Leaflet `zoom` level.
  - `displayHeight`?: number (minimum 150, maximum 800)
  - `fill`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `version`: string

## VersionedMapProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "map"
  - `resourceId`?: string (minLength 1, maxLength 256)
  - `documentId`?: string (minLength 1, maxLength 256)
  - `viewport`?: MapViewport — The view a map opens at: `center` as `[lat, lng]` in the map's coordinate frame, the frame of a feature's `pos`, and the Leaflet `zoom` level.
  - `displayHeight`?: number (minimum 150, maximum 800)
  - `fill`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `version`: string

## VersionedMeterBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "meter"
  - `mode`: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating"
  - `items`: ({ id?: string (minLength 1, maxLength 256), name: string (maxLength 2048), icon: string (maxLength 256), ratingIcon?: string (maxLength 256), current: number (minimum 0), max: number (minimum 1), color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) | "none" })[] (max 256)
  - `showText`?: boolean
  - `showIcon`?: boolean
  - `showMax`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `version`: string

## VersionedMeterProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "meter"
  - `mode`: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating"
  - `items`: ({ id?: string (minLength 1, maxLength 256), name: string (maxLength 2048), icon: string (maxLength 256), ratingIcon?: string (maxLength 256), current: number (minimum 0), max: number (minimum 1), color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$) | "none" })[] (max 256)
  - `showText`?: boolean
  - `showIcon`?: boolean
  - `showMax`?: boolean
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `version`: string

## VersionedOrderedListBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "orderedList"
  - `start`?: integer (minimum 0)
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedParagraphBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "paragraph"
  - `content`: Run[] (max 10000)
  - `version`: string

## VersionedProperty
A PropertyBlock plus the document `version` it was read or written at.
  - one of: VersionedTextFieldProperty | VersionedKeyValueProperty | VersionedImageProperty | VersionedMeterProperty | VersionedResourceCollectionProperty | VersionedResourceLinkProperty | VersionedEmbedProperty | VersionedMapProperty | VersionedUnsupportedProperty

## VersionedQuoteBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "quote"
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedResourceCollectionBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "resourceCollection"
  - `items`?: { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `filter`?: FilterPredicate — A collection filter. `composite` combines `filters` with `and`, `or` or `not`. Nesting through `children`, `rows` and filter `filters` is limited to 64 levels; …
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `version`: string

## VersionedResourceCollectionProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "resourceCollection"
  - `items`?: { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `filter`?: FilterPredicate — A collection filter. `composite` combines `filters` with `and`, `or` or `not`. Nesting through `children`, `rows` and filter `filters` is limited to 64 levels; …
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `version`: string

## VersionedResourceLinkBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "resourceLink"
  - `items`: { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `version`: string

## VersionedResourceLinkProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "resourceLink"
  - `items`: { id?: string (minLength 1, maxLength 256), rank?: string (minLength 1, maxLength 65536), resourceId: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256) }[] (max 256)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `version`: string

## VersionedRuleBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "rule"
  - `version`: string

## VersionedSecretBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "secret"
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedTableBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "table"
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedTableCellBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "tableCell"
  - `header`?: boolean
  - `colspan`?: integer (minimum 1)
  - `rowspan`?: integer (minimum 1)
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedTableRowBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "tableRow"
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedTaskItemBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "taskItem"
  - `checked`: boolean
  - `content`: Run[] (max 10000)
  - `version`: string

## VersionedTaskListBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "taskList"
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedTextFieldBlock
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "textField"
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `layout`?: BlockLayout — Where a block sits in the flow of the page. `default` is full width. `wrapLeft` and `wrapRight` float the block to that side and let the text after it wrap besi…
  - `width`?: integer (minimum 10, maximum 100) — Block width as a percentage of the column it sits in, 10 to 100. It applies when `layout` is not `default`.
  - `children`: Block[] (max 10000)
  - `version`: string

## VersionedTextFieldProperty
  - `id`?: string (minLength 1, maxLength 256)
  - `kind`: "textField"
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `children`: Block[] (max 10000)
  - `rank`?: string (minLength 1, maxLength 65536)
  - `isHidden`?: boolean
  - `version`: string

## VersionedUnsupportedBlock
  - `kind`: "unsupported"
  - `id`: string (minLength 1, maxLength 256)
  - `version`: string

## VersionedUnsupportedProperty
  - `kind`: "unsupported"
  - `id`: string (minLength 1, maxLength 256)
  - `rank`?: string (minLength 1, maxLength 65536)
  - `title`?: string (maxLength 256)
  - `isTitleHidden`?: boolean
  - `isHidden`?: boolean
  - `version`: string
