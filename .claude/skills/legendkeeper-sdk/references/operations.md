# LegendKeeper v3 operations

Generated from `@legendkeeper/sdk` and its bundled OpenAPI spec (API 3.0.0). Each entry: SDK call, HTTP route, path params (first SDK argument; `projectId` is always optional in the SDK), query params and body fields (second SDK argument), headers the SDK exposes as options, and the success response.

Legend: `field?` = optional. `ifMatch` = If-Match version header. `idempotencyKey` = Idempotency-Key header (all POSTs). Paginated lists take `limit` + `cursor` and return `Page<T>`.

## assets

### `lk.assets.createFolder` — Create an asset folder
`POST /api/v3/projects/{projectId}/assets` · operationId `createAssetFolder`
- options: `idempotencyKey`
- body (AssetCreateParams):
  - `name`: string (minLength 1, maxLength 200) — Folder name, 1–200 characters (this endpoint provisions a folder; images upload through createImageUpload and createImageAsset).
  - `folderId`?: string (maxLength 256) — Parent folder ID (root if omitted). It must be the id of a FOLDER asset in this project; any other id answers 400 VALIDATION_ERROR at `folderId`.
- returns: 201 Asset
- notes: Creates a folder in the project's asset library. Body is AssetCreateParams. Images are created through createImageUpload and createImageAsset. Any member may create a folder.

### `lk.assets.createImage` — Create an image asset
`POST /api/v3/projects/{projectId}/assets/images` · operationId `createImageAsset`
- options: `idempotencyKey`
- body (ImageAssetCreateParams):
  - `uploadKey`: string (minLength 1, maxLength 512) — The `uploadKey` from createImageUpload in this project. A key from another project, or one with no image stored under it, answers 400 VALIDATION_ERROR.
  - `name`: string (minLength 1, maxLength 200) — Asset name, 1–200 characters.
  - `description`?: string (maxLength 10000) — Asset description, stored on the asset and returned by getAsset. Omitted, the asset has no description.
  - `folderId`?: string (maxLength 256) — Folder to place the asset in (root if omitted). It must be the id of a FOLDER asset in this project; any other id answers 400 VALIDATION_ERROR at `folderId`.
- returns: 201 Asset
- notes: Step two of uploading an image. Body is ImageAssetCreateParams. The server reads the stored file and records its real size, content type and pixel dimensions. A file past the project owner's storage quota answers 413 STORAGE_QUOTA_EXCEEDED and no asset is created. Any project member may call it.

### `lk.assets.createImageUpload` — Create an image upload
`POST /api/v3/projects/{projectId}/assets/uploads` · operationId `createImageUpload`
- options: `idempotencyKey`
- body (ImageUploadCreateParams):
  - `contentType`: "image/jpeg" | "image/jpg" | "image/png" | "image/gif" | "image/webp" — The MIME type of the image. The upload must send it as `content-type`.
  - `contentLength`: integer — The size of the file in bytes, charged against the storage quota and the daily upload budget. The upload body must be exactly this many bytes. A size past the p…
  - `contentHash`?: string (minLength 64, maxLength 64, pattern ^[a-f0-9]{64}$) — Optional lowercase hex SHA-256 of the file. When sent, storage rejects an upload whose bytes do not match it.
- returns: 200 ImageUpload
- notes: Step one of uploading an image. Body is ImageUploadCreateParams. The response carries a signed `uploadUrl`, the `headers` to send with it and an `uploadKey`. Send the file with `PUT` to `uploadUrl` before `expiresAt`, then call createImageAsset with the `uploadKey`. Any project member may call it.

### `lk.assets.delete` — Delete an asset
`DELETE /api/v3/projects/{projectId}/assets/{assetId}` · operationId `deleteAsset`
- path: `assetId`
- returns: 204 no body
- notes: Deletes the asset. Deleting a folder deletes everything inside it at any depth. Requires the ADMIN role.

### `lk.assets.get` — Get an asset
`GET /api/v3/projects/{projectId}/assets/{assetId}` · operationId `getAsset`
- path: `assetId`
- returns: 200 Asset
- notes: The asset by id. A hidden asset answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.assets.list` — List assets
`GET /api/v3/projects/{projectId}/assets` · operationId `listAssets` · paginated
- query:
  - `cursor`?: string (maxLength 2048)
  - `limit`?: integer (minimum 1, maximum 100)
  - `folderId`?: string (maxLength 256)
- returns: 200 AssetList
- notes: A page of the assets (images, maps and folders) in one folder of the project's library: the root when `folderId` is omitted, else that folder's direct contents. Assets are ordered by id. Pass `nextCursor` back as `cursor` for the next page. A caller who is not a project admin does not see hidden assets.

### `lk.assets.update` — Update an asset
`PATCH /api/v3/projects/{projectId}/assets/{assetId}` · operationId `updateAsset`
- path: `assetId`
- body (AssetUpdateParams):
  - `name`?: string (minLength 1, maxLength 200) — New name, 1–200 characters.
  - `description`?: string (maxLength 10000)
  - `folderId`?: string (maxLength 256) | null (maxLength 256) — Move to a folder; null moves to root. It must be the id of a FOLDER asset in this project that is neither the asset itself nor inside it; any other id answers 4…
  - `isHidden`?: boolean
- returns: 204 no body
- notes: Body is AssetUpdateParams. Only the fields sent change and the response has no body. An empty body answers 400 VALIDATION_ERROR. A refused `folderId` changes no field. Requires the ADMIN role.

## blocks

### `lk.blocks.createProperty` — Add a property to an infobox
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties` · operationId `createBlockProperty`
- path: `resourceId`, `documentId`, `blockId`
- options: `ifMatch`, `idempotencyKey`
- body (PropertyCreateRequest):
  - one of: { id?: string (minLength 1, maxLength 256), kind: "textField", title?: string (maxLength 256), isTitleHidden?: boolean, children: Block[] (max 10000), isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "keyValue", display?: "list" | "grid" | "inline", rows: object[] (max 256), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "image", url: string (maxLength 2048), alt?: string (maxLength 500), fill?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "meter", mode: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating", items: object[] (max 256), showText?: boolean, showIcon?: boolean, showMax?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "resourceCollection", items?: object[] (max 256), filter?: FilterPredicate, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "resourceLink", items: object[] (max 256), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "embed", provider: "youtube" | "spotify" | "soundcloud", url: string (maxLength 2048), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "map", resourceId?: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256), viewport?: MapViewport, displayHeight?: number (minimum 150, maximum 800), fill?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) }
- returns: 201 VersionedProperty
- notes: Adds a property to the infobox. Body is a PropertyCreateRequest, the same shape as createProperty. A duplicate id answers 409. Responses carry the document `version` in the body and as `ETag`. An infobox property marked `isHidden` answers 404 NOT_FOUND to a caller who is not a project admin, and only a project admin may set or clear `isHidden` (otherwise 403 FORBIDDEN).

### `lk.blocks.createPropertyRow` — Create a infobox property row
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties/{propertyId}/rows` · operationId `createBlockPropertyRow`
- path: `resourceId`, `documentId`, `blockId`, `propertyId`
- options: `ifMatch`, `idempotencyKey`
- body (RowCreateRequest):
  - `key`: string (maxLength 256)
  - `content`?: Run[] (max 10000) — The row value as runs. A `{ break: true }` run starts a new line; a stored line break and a paragraph boundary both read back as `break`. When both `content` an…
  - `text`?: string (maxLength 100000) — The row value as a plain string. Ignored when `content` is sent.
  - `before`?: string (maxLength 256) — Place before this row id. At most one of `before` and `after`; neither appends last.
  - `after`?: string (maxLength 256) — Place after this row id. At most one of `before` and `after`; neither appends last.
- returns: 201 Row
- notes: Adds a row to the infobox property. Body is a RowCreateRequest: `key` plus a value, `content` or `text`, and an optional placement. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.createRow` — Create a block row
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/rows` · operationId `createBlockRow`
- path: `resourceId`, `documentId`, `blockId`
- options: `ifMatch`, `idempotencyKey`
- body (RowCreateRequest):
  - `key`: string (maxLength 256)
  - `content`?: Run[] (max 10000) — The row value as runs. A `{ break: true }` run starts a new line; a stored line break and a paragraph boundary both read back as `break`. When both `content` an…
  - `text`?: string (maxLength 100000) — The row value as a plain string. Ignored when `content` is sent.
  - `before`?: string (maxLength 256) — Place before this row id. At most one of `before` and `after`; neither appends last.
  - `after`?: string (maxLength 256) — Place after this row id. At most one of `before` and `after`; neither appends last.
- returns: 201 Row
- notes: Adds a row to the block. Body is a RowCreateRequest: `key` plus a value, `content` or `text`, and an optional placement. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.delete` — Delete a block
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}` · operationId `deleteBlock`
- path: `resourceId`, `documentId`, `blockId`
- options: `ifMatch`
- returns: 204 no body
- notes: Removes the block and its subtree. A removal that leaves the document invalid, for example the paragraph a list item requires, answers 400 INVALID_CONTENT. Responses carry the document `version` in the body and as `ETag`. Removing a block that holds a secret or an infobox property marked `isHidden` answers 403 FORBIDDEN to a caller who is not a project admin.

### `lk.blocks.deleteProperty` — Remove an infobox property
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties/{propertyId}` · operationId `deleteBlockProperty`
- path: `resourceId`, `documentId`, `blockId`, `propertyId`
- options: `ifMatch`
- returns: 204 no body
- notes: Removes the row from the infobox. Removing the last property leaves one empty row. Responses carry the document `version` in the body and as `ETag`. An infobox property marked `isHidden` answers 404 NOT_FOUND to a caller who is not a project admin, and only a project admin may set or clear `isHidden` (otherwise 403 FORBIDDEN).

### `lk.blocks.deletePropertyRow` — Delete a infobox property row
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties/{propertyId}/rows/{rowId}` · operationId `deleteBlockPropertyRow`
- path: `resourceId`, `documentId`, `blockId`, `propertyId`, `rowId`
- options: `ifMatch`
- returns: 204 no body
- notes: Removes the row from the infobox property. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.deleteRow` — Delete a block row
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/rows/{rowId}` · operationId `deleteBlockRow`
- path: `resourceId`, `documentId`, `blockId`, `rowId`
- options: `ifMatch`
- returns: 204 no body
- notes: Removes the row from the block. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.get` — Get a block
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}` · operationId `getBlock`
- path: `resourceId`, `documentId`, `blockId`
- returns: 200 VersionedBlock
- notes: The block with its subtree. For a caller who is not a project admin, secret blocks and their contents are omitted. A block inside a secret answers 404 NOT_FOUND to a caller who is not a project admin. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.getProperty` — Get an infobox property
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties/{propertyId}` · operationId `getBlockProperty`
- path: `resourceId`, `documentId`, `blockId`, `propertyId`
- returns: 200 VersionedProperty
- notes: The infobox row as a PropertyBlock. A block that is not an infobox answers 404 NOT_FOUND. An infobox inside a secret answers 404 NOT_FOUND to a caller who is not a project admin. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin. Responses carry the document `version` in the body and as `ETag`. An infobox property marked `isHidden` answers 404 NOT_FOUND to a caller who is not a project admin, and only a project admin may set or clear `isHidden` (otherwise 403 FORBIDDEN).

### `lk.blocks.insert` — Insert a block
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks` · operationId `insertBlock`
- path: `resourceId`, `documentId`
- options: `ifMatch`, `idempotencyKey`
- body (BlockInsertRequest):
  - `block`: Block — A content block. Container kinds carry `children`; text kinds carry `content` runs. A container written with no children reads back holding one empty paragraph.…
  - `after`?: string (maxLength 256) — Insert after this block id.
  - `before`?: string (maxLength 256) — Insert before this block id.
  - `parent`?: string (maxLength 256) — Append as the last child of this container block.
- returns: 201 VersionedBlock
- notes: Inserts a block with its subtree. Body is BlockInsertRequest. A write to a `blank` document converts it to a page document and saves the content in the same request. Responses carry the document `version` in the body and as `ETag`. Secret blocks and infobox properties marked `isHidden` are admin-only. For a caller who is not a project admin, the write keeps each admin-only block and property where it was; a body that contains one, or a write that would remove one, answers 403 FORBIDDEN and changes nothing.

### `lk.blocks.listProperties` — List an infobox's properties
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties` · operationId `listBlockProperties` · list (single page)
- path: `resourceId`, `documentId`, `blockId`
- returns: 200 BlockPropertyList
- notes: The infobox's rows as PropertyBlocks, sorted by rank. An infobox inside a secret answers 404 NOT_FOUND to a caller who is not a project admin. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin. Responses carry the document `version` in the body and as `ETag`. An infobox property marked `isHidden` answers 404 NOT_FOUND to a caller who is not a project admin, and only a project admin may set or clear `isHidden` (otherwise 403 FORBIDDEN).

### `lk.blocks.listPropertyRows` — List infobox property rows
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties/{propertyId}/rows` · operationId `listBlockPropertyRows` · list (single page)
- path: `resourceId`, `documentId`, `blockId`, `propertyId`
- returns: 200 RowList
- notes: Every row of the infobox property as a Row, sorted by rank. The list is not paginated. An infobox inside a secret answers 404 NOT_FOUND to a caller who is not a project admin. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.listRows` — List block rows
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/rows` · operationId `listBlockRows` · list (single page)
- path: `resourceId`, `documentId`, `blockId`
- returns: 200 RowList
- notes: Every row of the block as a Row, sorted by rank. The list is not paginated. A block inside a secret answers 404 NOT_FOUND to a caller who is not a project admin. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.move` — Move a block
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/move` · operationId `moveBlock`
- path: `resourceId`, `documentId`, `blockId`
- options: `ifMatch`, `idempotencyKey`
- body (BlockMoveRequest):
  - `after`?: string (maxLength 256) — Insert after this block id.
  - `before`?: string (maxLength 256) — Insert before this block id.
  - `parent`?: string (maxLength 256) — Append as the last child of this container block.
- returns: 200 VersionedBlock
- notes: Moves a block with its subtree, which keeps its ids. Body is a BlockMoveRequest. Moving a block into itself answers 400 INVALID_CONTENT. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.replace` — Replace a block
`PUT /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}` · operationId `replaceBlock`
- path: `resourceId`, `documentId`, `blockId`
- options: `ifMatch`
- body (Block):
  - one of: ParagraphBlock | HeadingBlock | QuoteBlock | CodeBlock | RuleBlock | BulletListBlock | OrderedListBlock | ListItemBlock | TaskListBlock | TaskItemBlock | TableBlock | TableRowBlock | TableCellBlock | CalloutBlock | ExpandBlock | LayoutBlock | LayoutColumnBlock | ImageBlock | EmbedBlock | KeyValueBlock | InfoboxBlock | MeterBlock | ResourceCollectionBlock | ResourceLinkBlock | MapBlock | SecretBlock | TextFieldBlock | UnsupportedBlock
- returns: 200 VersionedBlock
- notes: Replaces the block and its subtree; the block keeps its id. Body is a Block. Requested ids in the subtree are kept, and ids of the replaced subtree may be reused. The same id twice in the body answers 400 VALIDATION_ERROR. Responses carry the document `version` in the body and as `ETag`. Secret blocks and infobox properties marked `isHidden` are admin-only. For a caller who is not a project admin, the write keeps each admin-only block and property where it was; a body that contains one, or a write that would remove one, answers 403 FORBIDDEN and changes nothing.

### `lk.blocks.update` — Update a block's fields
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}` · operationId `updateBlock`
- path: `resourceId`, `documentId`, `blockId`
- options: `ifMatch`
- body (BlockPatch):
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
- returns: 200 VersionedBlock
- notes: Updates the block's own fields. Body is a BlockPatch. Children are unchanged. Responses carry the document `version` in the body and as `ETag`. Secret blocks and infobox properties marked `isHidden` are admin-only. For a caller who is not a project admin, the write keeps each admin-only block and property where it was; a body that contains one, or a write that would remove one, answers 403 FORBIDDEN and changes nothing.

### `lk.blocks.updateProperty` — Update an infobox property
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties/{propertyId}` · operationId `updateBlockProperty`
- path: `resourceId`, `documentId`, `blockId`, `propertyId`
- options: `ifMatch`
- body (PropertyUpdateRequest):
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
- returns: 200 VersionedProperty
- notes: Updates an infobox row. Body is a PropertyUpdateRequest. An empty body answers 400 VALIDATION_ERROR. Patching `rank` moves the row into rank order. Responses carry the document `version` in the body and as `ETag`. An infobox property marked `isHidden` answers 404 NOT_FOUND to a caller who is not a project admin, and only a project admin may set or clear `isHidden` (otherwise 403 FORBIDDEN).

### `lk.blocks.updatePropertyRow` — Update a infobox property row
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/properties/{propertyId}/rows/{rowId}` · operationId `updateBlockPropertyRow`
- path: `resourceId`, `documentId`, `blockId`, `propertyId`, `rowId`
- options: `ifMatch`
- body (RowPatchRequest):
  - `key`?: string (maxLength 256)
  - `content`?: Run[] (max 10000) | null — The row value as runs. `null` clears the value. When both `content` and `text` are sent, `content` wins.
  - `text`?: string (maxLength 100000) — The row value as a plain string. It cannot be null.
- returns: 200 Row
- notes: Updates a row of the infobox property. Body is a RowPatchRequest: any of `key`, `content` and `text`. An empty body answers 400 VALIDATION_ERROR. Responses carry the document `version` in the body and as `ETag`.

### `lk.blocks.updateRow` — Update a block row
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks/{blockId}/rows/{rowId}` · operationId `updateBlockRow`
- path: `resourceId`, `documentId`, `blockId`, `rowId`
- options: `ifMatch`
- body (RowPatchRequest):
  - `key`?: string (maxLength 256)
  - `content`?: Run[] (max 10000) | null — The row value as runs. `null` clears the value. When both `content` and `text` are sent, `content` wins.
  - `text`?: string (maxLength 100000) — The row value as a plain string. It cannot be null.
- returns: 200 Row
- notes: Updates a row of the block. Body is a RowPatchRequest: any of `key`, `content` and `text`. An empty body answers 400 VALIDATION_ERROR. Responses carry the document `version` in the body and as `ETag`.

## boards

### `lk.boards.createShapes` — Create shapes, bindings and assets
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/board/shapes` · operationId `createBoardShapes`
- path: `resourceId`, `documentId`
- options: `ifMatch`, `idempotencyKey`
- body (BoardShapesCreateParams):
  - `shapes`: BoardShapeInput[] (max 500)
  - `bindings`?: BoardBindingInput[] (max 500)
  - `assets`?: BoardAssetInput[] (max 500)
- returns: 201 BoardShapesCreated
- notes: Body is BoardShapesCreateParams. At least one record is required. Bindings and image shapes may name records created in the same request. An id that already exists on the board answers 409 DUPLICATE_ID. The write is atomic: nothing is stored when any record fails validation. A document that is not a board or `blank` answers 400 KIND_MISMATCH. A write to a `blank` document converts it to a board document and saves the content in the same request.

### `lk.boards.deleteShapes` — Delete shapes
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/board/shapes/delete` · operationId `deleteBoardShapes`
- path: `resourceId`, `documentId`
- options: `ifMatch`, `idempotencyKey`
- body (BoardShapesDeleteParams):
  - `ids`: string (maxLength 256)[] (min 1, max 500) — Shape ids to delete.
- returns: 200 BoardShapesDeleted
- notes: Body is BoardShapesDeleteParams. Deletes the shapes, every shape they contain, and every binding attached to a deleted shape, as the app does; assets are kept. A shape id that is not on the board answers 404 NOT_FOUND and deletes nothing. A document that is not a board or `blank` answers 400 KIND_MISMATCH.

### `lk.boards.getContent` — Get a board's content
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/board` · operationId `getBoardContent`
- path: `resourceId`, `documentId`
- returns: 200 BoardContent
- notes: Every page, shape, binding and asset record of the board, with the tldraw schema that writes are validated against. A document that is not a board or `blank` answers 400 KIND_MISMATCH. A `blank` document reads as an empty board and stays `blank`. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.boards.listShapes` — List a board's shapes
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/board/shapes` · operationId `listBoardShapes` · list (single page)
- path: `resourceId`, `documentId`
- query:
  - `pageId`?: string (maxLength 256)
- returns: 200 BoardShapeList
- notes: Every shape record of the board, ordered by `index`. The list is not paginated. A document that is not a board or `blank` answers 400 KIND_MISMATCH. A `blank` document reads as an empty board and stays `blank`. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.boards.replaceContent` — Replace a board's content
`PUT /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/board` · operationId `replaceBoardContent`
- path: `resourceId`, `documentId`
- options: `ifMatch`
- body (BoardContentReplaceParams):
  - `shapes`: BoardShapeInput[] (max 500)
  - `bindings`?: BoardBindingInput[] (max 500)
  - `assets`?: BoardAssetInput[] (max 500)
- returns: 200 BoardContent
- notes: Body is BoardContentReplaceParams. Deletes every shape, binding and asset of the board and stores the ones sent, which are built as createBoardShapes builds them; pages are kept. Sending ids read from getBoardContent keeps them. The write is atomic: nothing is stored when any record fails validation. A document that is not a board or `blank` answers 400 KIND_MISMATCH. A write to a `blank` document converts it to a board document and saves the content in the same request.

### `lk.boards.updateShapes` — Update shapes
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/board/shapes` · operationId `updateBoardShapes`
- path: `resourceId`, `documentId`
- options: `ifMatch`
- body (BoardShapesUpdateParams):
  - `shapes`: BoardShapePatch[] (min 1, max 500)
- returns: 200 BoardShapesUpdated
- notes: Body is BoardShapesUpdateParams. A shape id that is not on the board answers 404 NOT_FOUND and changes nothing. The write is atomic: nothing is stored when any record fails validation. A document that is not a board or `blank` answers 400 KIND_MISMATCH.

## calendars

### `lk.calendars.create` — Create a calendar
`POST /api/v3/projects/{projectId}/calendars` · operationId `createCalendar`
- options: `idempotencyKey`
- body (CalendarSpec):
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
- returns: 201 Calendar
- notes: Creates a custom calendar in the project. Body is a CalendarSpec. The response is the Calendar with its `version`. Any project member may create a calendar.

### `lk.calendars.delete` — Delete a calendar
`DELETE /api/v3/projects/{projectId}/calendars/{calendarId}` · operationId `deleteCalendar`
- path: `calendarId`
- options: `ifMatch`
- returns: 204 no body
- notes: Removes the calendar from the project. Timeline documents that name it keep their `calendarId` and their events; while the id names no calendar they render in the Gregorian calendar, and creating a calendar with that id again restores it. A built-in calendar cannot be changed or deleted; create a copy with createCalendar instead. Any project member may delete a calendar.

### `lk.calendars.list` — List the project's calendars
`GET /api/v3/projects/{projectId}/calendars` · operationId `listCalendars` · list (single page)
- returns: 200 CalendarList
- notes: The project's custom calendars followed by the built-in calendars, each as a Calendar with its `version`. A timeline document names one of these by `calendarId`. The list is not paginated.

### `lk.calendars.update` — Replace a calendar
`PUT /api/v3/projects/{projectId}/calendars/{calendarId}` · operationId `updateCalendar`
- path: `calendarId`
- options: `ifMatch`
- body (CalendarSpec):
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
- returns: 200 Calendar
- notes: Body is a CalendarSpec that replaces the whole calendar; fields left out take their defaults or are removed. Timelines on the calendar keep their events, which are stored in minutes, and render them in the new calendar. A built-in calendar cannot be changed or deleted; create a copy with createCalendar instead. The response is the Calendar with its new `version`. Any project member may update a calendar.

## documents

### `lk.documents.assignBlockIds` — Assign block ids
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/block-ids` · operationId `assignBlockIds`
- path: `resourceId`, `documentId`
- options: `idempotencyKey`
- returns: 200 BlockIdsResult
- notes: Assigns a stable id to every block in a page document that lacks one. Idempotent. Run this once on a legacy document before addressing its blocks; reads never assign ids. A document that is not a page or `blank` answers 400 KIND_MISMATCH. A `blank` document has no blocks, so the call assigns none and the document stays `blank`.

### `lk.documents.create` — Create a document
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs` · operationId `createDocument`
- path: `resourceId`
- options: `idempotencyKey`
- body (DocumentCreateParams):
  - `name`: string (minLength 1, maxLength 500)
  - `type`: "blank" | "page" | "board" | "map" | "time"
  - `isHidden`?: boolean — Defaults to false.
  - `isFullWidth`?: boolean — Defaults to false.
  - `calendarId`?: string (minLength 1, maxLength 100) — The id of a calendar from listCalendars, custom or built-in, that a timeline (`time`) document's dates render in. An id that names no calendar in the project, o…
- returns: 201 Document
- notes: Creates a document in the resource. Body is DocumentCreateParams. The document is appended after the resource's existing documents and starts empty; a map starts with `mapImage` null. Set a map's image with updateDocument. A new resource already has one `blank` document, returned in createResource's `documents`; write content to it instead of creating a document, and call createDocument for each additional document.

### `lk.documents.delete` — Delete a document
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}` · operationId `deleteDocument`
- path: `resourceId`, `documentId`
- returns: 204 no body
- notes: Marks the document deleted together with its content; it no longer appears in listDocuments. Its content is kept: it waits in the project's trash until restoreDocument brings it back or the trash is emptied. Deleting a document that is already deleted answers 409 ALREADY_DELETED.

### `lk.documents.get` — Get a document
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}` · operationId `getDocument`
- path: `resourceId`, `documentId`
- returns: 200 Document
- notes: The document summary. Read page content with getDocumentBlocks, board content with getBoardContent, map content with listFeatures and timeline content with listLanes and listEvents. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.documents.getBlocks` — Get a document as blocks
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks` · operationId `getDocumentBlocks`
- path: `resourceId`, `documentId`
- returns: 200 DocumentBlocks
- notes: The whole document tree as Blocks. For a caller who is not a project admin, secret blocks and their contents are omitted. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin. A `blank` document reads as an empty page and stays `blank`. Responses carry the document `version` in the body and as `ETag`.

### `lk.documents.list` — List a resource's documents
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs` · operationId `listDocuments` · list (single page)
- path: `resourceId`
- returns: 200 DocumentList
- notes: Every document of the resource as a Document summary (`id`, `name`, `type`, `rank`, `isHidden`, `isFullWidth`, timestamps, and `sources` on a timeline). The list is not paginated. Hidden documents are listed only for project admins; order the result by `rank` to match the app. A resource the caller cannot reach, because it or an ancestor is hidden or denies access, answers 404 NOT_FOUND.

### `lk.documents.replaceBlocks` — Replace a document
`PUT /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/blocks` · operationId `replaceDocumentBlocks`
- path: `resourceId`, `documentId`
- options: `ifMatch`
- body (DocumentBlocksWrite):
  - `blocks`: Block[] (max 10000) — The whole new tree. A block without an id is given a new id; a requested id is kept. The same block id twice answers 400 VALIDATION_ERROR at the second occurren…
- returns: 200 DocumentBlocks
- notes: Replaces the whole document tree. Body is DocumentBlocksWrite. The result is validated as a whole and nothing is written on 400. A write to a `blank` document converts it to a page document and saves the content in the same request. Responses carry the document `version` in the body and as `ETag`. Secret blocks and infobox properties marked `isHidden` are admin-only. For a caller who is not a project admin, the write keeps each admin-only block and property where it was; a body that contains one, or a write that would remove one, answers 403 FORBIDDEN and changes nothing.

### `lk.documents.restore` — Restore a deleted document
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/restore` · operationId `restoreDocument`
- path: `resourceId`, `documentId`
- options: `idempotencyKey`
- returns: 200 Document
- notes: Brings a deleted document back in its old place in the resource, with its content; it appears in listDocuments again. When the document's resource is deleted, restore the resource with restoreResource, which brings back the documents it had when it was deleted. A document that was moved to another resource, or that the trash has erased, answers 404 NOT_FOUND. Restoring needs the same access as deleting the document. The response is the restored document.

### `lk.documents.update` — Update a document
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}` · operationId `updateDocument`
- path: `resourceId`, `documentId`
- body (DocumentUpdateParams):
  - `name`?: string (minLength 1, maxLength 500)
  - `rank`?: string (maxLength 65536)
  - `isHidden`?: boolean
  - `isFullWidth`?: boolean
  - `calendarId`?: string (minLength 1, maxLength 100) — The id of a calendar from listCalendars, custom or built-in, that a timeline (`time`) document's dates render in. An id that names no calendar in the project, o…
  - `mapImage`?: MapImageParams — The image asset to show as a map document's image. It sets or replaces the image, as "Add map" and "Replace map" do in the app. The map's coordinate frame follo…
  - `sources`?: TimelineSource[] (max 100) — The timelines this timeline (`time`) document chains, in order. `sources` replaces the timelines a timeline (`time`) document chains, as adding and removing tim…
- returns: 200 Document
- notes: Updates a document's metadata. Body is DocumentUpdateParams. Only the fields sent change; content is not touched. `calendarId` and `sources` apply to a timeline (`time`) document and `mapImage` to a map document. An empty body answers 400 VALIDATION_ERROR. Setting `mapImage` on a `blank` document converts it to a map document.

## features

### `lk.features.create` — Create a feature
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/features` · operationId `createFeature`
- path: `resourceId`, `documentId`
- options: `idempotencyKey`
- body (FeatureCreateParams):
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
- returns: 201 Feature
- notes: Creates a feature on the map. Body is FeatureCreateParams. A document that is not a map or `blank` answers 400 KIND_MISMATCH. A write to a `blank` document converts it to a map document and saves the content in the same request.

### `lk.features.delete` — Delete a feature
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/features/{featureId}` · operationId `deleteFeature`
- path: `resourceId`, `documentId`, `featureId`
- returns: 204 no body
- notes: Removes the feature. Deleting a folder does not delete the features nested under it. A document that is not a map or `blank` answers 400 KIND_MISMATCH.

### `lk.features.get` — Get a feature
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/features/{featureId}` · operationId `getFeature`
- path: `resourceId`, `documentId`, `featureId`
- returns: 200 Feature
- notes: The feature by id. A hidden feature answers 404 NOT_FOUND to a caller who is not a project admin. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.features.list` — List a map's features
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/features` · operationId `listFeatures` · list (single page)
- path: `resourceId`, `documentId`
- query:
  - `type`?: "pin" | "label" | "region" | "path" | "folder"
- returns: 200 FeatureList
- notes: Pins, labels, regions, paths and folders on a map document, each as a Feature. The list is not paginated. A caller who is not a project admin does not see hidden features. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.features.update` — Update a feature
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/features/{featureId}` · operationId `updateFeature`
- path: `resourceId`, `documentId`, `featureId`
- body (FeatureUpdateParams):
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
- returns: 200 Feature
- notes: Body is FeatureUpdateParams. Only the fields sent change. A document that is not a map or `blank` answers 400 KIND_MISMATCH.

## invites

### `lk.invites.list` — List a project's pending invites
`GET /api/v3/projects/{projectId}/invites` · operationId `listInvites` · list (single page)
- returns: 200 InviteList
- notes: Every invite of the project whose status is pending, with the invited `email`, `role` and `expiresAt`. Accepted, declined and revoked invites are not listed. An invite past its `expiresAt` stays listed, and can be revoked, until someone tries to accept it. The list is not paginated. Requires the ADMIN role.

### `lk.invites.revoke` — Revoke a pending invite
`DELETE /api/v3/projects/{projectId}/invites/{inviteId}` · operationId `revokeInvite`
- path: `inviteId`
- returns: 204 no body
- notes: Marks the invite revoked so its token can no longer be accepted. An invite past its `expiresAt` can still be revoked. Requires the ADMIN role.

## members

### `lk.members.invite` — Invite a member by email
`POST /api/v3/projects/{projectId}/members` · operationId `inviteMember`
- options: `idempotencyKey`
- body (MemberInviteParams):
  - `email`: string (maxLength 254, format email) — Email address to invite.
- returns: 200 InviteResult
- notes: Body is MemberInviteParams. Creates a pending MEMBER invite that expires after 7 days and emails the address an accept link. An address that belongs to a member or has a pending invite answers `{ success: true }` with `alreadyMember` or `alreadyInvited`, sends no email and counts against no invite limit. Requires the ADMIN role.

### `lk.members.list` — List project members
`GET /api/v3/projects/{projectId}/members` · operationId `listMembers` · list (single page)
- returns: 200 MemberList
- notes: Every member of the project as a Member (`id` is the user id) with their `role`: OWNER, ADMIN or MEMBER. Pending invites are not members; see listInvites. The list is not paginated.

### `lk.members.remove` — Remove a member
`DELETE /api/v3/projects/{projectId}/members/{userId}` · operationId `removeMember`
- path: `userId`
- returns: 204 no body
- notes: Removes the user from the project. The caller may remove a member whose role ranks below their own (MEMBER < ADMIN < OWNER): the owner removes admins and members; an admin removes members. Any member other than the owner may remove themselves. Removing the owner, or a member of equal or higher rank, answers 403 FORBIDDEN.

## projects

### `lk.projects.get` — Get a project
`GET /api/v3/projects/{projectId}` · operationId `getProject`
- returns: 200 Project
- notes: The project by id: `id`, `name`, `isPublic` and `createdAt`. A caller who is not a member answers 403 FORBIDDEN, the same as for a project that does not exist.

### `lk.projects.list` — List your projects
`GET /api/v3/projects` · operationId `listProjects` · paginated
- query:
  - `cursor`?: string (maxLength 2048)
  - `limit`?: integer (minimum 1, maximum 100)
- returns: 200 ProjectList
- notes: A page of the projects the caller is a member of, ordered by id. With an API key the page holds only the key's project. Pass `nextCursor` back as `cursor` for the next page.

## properties

### `lk.properties.create` — Create a property
`POST /api/v3/projects/{projectId}/resources/{resourceId}/properties` · operationId `createProperty`
- path: `resourceId`
- options: `idempotencyKey`
- body (PropertyCreateRequest):
  - one of: { id?: string (minLength 1, maxLength 256), kind: "textField", title?: string (maxLength 256), isTitleHidden?: boolean, children: Block[] (max 10000), isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "keyValue", display?: "list" | "grid" | "inline", rows: object[] (max 256), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "image", url: string (maxLength 2048), alt?: string (maxLength 500), fill?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "meter", mode: "bar" | "wheel" | "gauge-180" | "gauge-270" | "pool" | "rating", items: object[] (max 256), showText?: boolean, showIcon?: boolean, showMax?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "resourceCollection", items?: object[] (max 256), filter?: FilterPredicate, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "resourceLink", items: object[] (max 256), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "embed", provider: "youtube" | "spotify" | "soundcloud", url: string (maxLength 2048), title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) } | { id?: string (minLength 1, maxLength 256), kind: "map", resourceId?: string (minLength 1, maxLength 256), documentId?: string (minLength 1, maxLength 256), viewport?: MapViewport, displayHeight?: number (minimum 150, maximum 800), fill?: boolean, title?: string (maxLength 256), isTitleHidden?: boolean, isHidden?: boolean, before?: string (maxLength 256), after?: string (maxLength 256) }
- returns: 201 PropertyBlock
- notes: Adds a property to the resource's sidebar. Body is a PropertyCreateRequest. A supplied `id` that is already used answers 409.

### `lk.properties.createRow` — Create a property row
`POST /api/v3/projects/{projectId}/resources/{resourceId}/properties/{propertyId}/rows` · operationId `createPropertyRow`
- path: `resourceId`, `propertyId`
- options: `ifMatch`, `idempotencyKey`
- body (RowCreateRequest):
  - `key`: string (maxLength 256)
  - `content`?: Run[] (max 10000) — The row value as runs. A `{ break: true }` run starts a new line; a stored line break and a paragraph boundary both read back as `break`. When both `content` an…
  - `text`?: string (maxLength 100000) — The row value as a plain string. Ignored when `content` is sent.
  - `before`?: string (maxLength 256) — Place before this row id. At most one of `before` and `after`; neither appends last.
  - `after`?: string (maxLength 256) — Place after this row id. At most one of `before` and `after`; neither appends last.
- returns: 201 Row
- notes: Adds a row to the property. Body is a RowCreateRequest: `key` plus a value, `content` or `text`, and an optional placement. Responses carry the document `version` in the body and as `ETag`.

### `lk.properties.delete` — Delete a property
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/properties/{propertyId}` · operationId `deleteProperty`
- path: `resourceId`, `propertyId`
- returns: 204 no body
- notes: Removes the property from the resource's sidebar. The property's rows go with it; blocks on the resource's pages are not affected.

### `lk.properties.deleteRow` — Delete a property row
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/properties/{propertyId}/rows/{rowId}` · operationId `deletePropertyRow`
- path: `resourceId`, `propertyId`, `rowId`
- options: `ifMatch`
- returns: 204 no body
- notes: Removes the row from the property. Responses carry the document `version` in the body and as `ETag`.

### `lk.properties.get` — Get a property
`GET /api/v3/projects/{projectId}/resources/{resourceId}/properties/{propertyId}` · operationId `getProperty`
- path: `resourceId`, `propertyId`
- returns: 200 PropertyBlock
- notes: The sidebar property as a PropertyBlock: its kind's fields plus the envelope (`id`, `rank`, `title`, `isTitleHidden`, `isHidden`). A hidden property answers 404 NOT_FOUND to a caller who is not a project admin. A resource the caller cannot reach, because it or an ancestor is hidden or denies access, answers 404 NOT_FOUND.

### `lk.properties.list` — List a resource's properties
`GET /api/v3/projects/{projectId}/resources/{resourceId}/properties` · operationId `listProperties` · list (single page)
- path: `resourceId`
- returns: 200 PropertyList
- notes: Sidebar properties, sorted by rank. Each is a PropertyBlock. A property whose type the public model cannot express reads as `{ kind: "unsupported", id }` with its envelope; echo it unchanged to preserve it. A caller who is not a project admin does not see hidden properties. A resource the caller cannot reach, because it or an ancestor is hidden or denies access, answers 404 NOT_FOUND.

### `lk.properties.listRows` — List property rows
`GET /api/v3/projects/{projectId}/resources/{resourceId}/properties/{propertyId}/rows` · operationId `listPropertyRows` · list (single page)
- path: `resourceId`, `propertyId`
- returns: 200 RowList
- notes: Every row of the property as a Row, sorted by rank. The list is not paginated. A hidden property answers 404 NOT_FOUND to a caller who is not a project admin. A resource the caller cannot reach, because it or an ancestor is hidden or denies access, answers 404 NOT_FOUND. Responses carry the document `version` in the body and as `ETag`.

### `lk.properties.update` — Update a property
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/properties/{propertyId}` · operationId `updateProperty`
- path: `resourceId`, `propertyId`
- body (PropertyUpdateRequest):
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
- returns: 200 PropertyBlock
- notes: Body is a PropertyUpdateRequest. An empty body answers 400 VALIDATION_ERROR. The envelope of an `unsupported` property can be patched; its content cannot.

### `lk.properties.updateRow` — Update a property row
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/properties/{propertyId}/rows/{rowId}` · operationId `updatePropertyRow`
- path: `resourceId`, `propertyId`, `rowId`
- options: `ifMatch`
- body (RowPatchRequest):
  - `key`?: string (maxLength 256)
  - `content`?: Run[] (max 10000) | null — The row value as runs. `null` clears the value. When both `content` and `text` are sent, `content` wins.
  - `text`?: string (maxLength 100000) — The row value as a plain string. It cannot be null.
- returns: 200 Row
- notes: Updates a row of the property. Body is a RowPatchRequest: any of `key`, `content` and `text`. An empty body answers 400 VALIDATION_ERROR. Responses carry the document `version` in the body and as `ETag`.

## resources

### `lk.resources.create` — Create a resource
`POST /api/v3/projects/{projectId}/resources` · operationId `createResource`
- options: `idempotencyKey`
- body (ResourceCreateParams):
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
- returns: 201 Resource
- notes: Creates a resource with the documents in `documents`. Body is ResourceCreateParams. The resource is appended after its last sibling unless `after` or `before` places it. See Resource order. The request is validated as a whole: on any 4xx, nothing is created. The response is the full Resource, with the new documents in `documents` in request order; read their content with getDocumentBlocks. A non-admin caller must create the resource under a resource they can edit, and not hidden.

### `lk.resources.createFromTemplate` — Create a resource from a template
`POST /api/v3/projects/{projectId}/resources/from-template` · operationId `createResourceFromTemplate`
- options: `idempotencyKey`
- body (ResourceFromTemplateParams):
  - `templateId`: string (maxLength 256) — The template to copy: a resource under the `templates` root, at any depth. A resource that is not a template answers 400 VALIDATION_ERROR. An unknown or deleted…
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id for the new resource: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Ident…
  - `name`?: string (minLength 1, maxLength 500) — Name of the new resource. Omitted, it is the template's name with the word `Template` removed.
  - `parentId`?: string (maxLength 256) — The parent of the new resource, as in createResource. Omitted, the resource is created at the root. An unknown or deleted id answers 404 NOT_FOUND.
  - `includeChildren`?: boolean — `true` also copies the template's descendants the caller can view, keeping their tree. Default false. A copy holds at most 100 resources; a larger template answ…
  - `after`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly after it. Mutually exclusive with `before`.
  - `before`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly before it. Mutually exclusive with `after`.
- returns: 201 Resource
- notes: Creates a resource as a copy of a template. Body is ResourceFromTemplateParams. The copy takes the template's fields, properties and documents with their content, under new ids; it is placed as createResource places a resource. Each copied resource counts as one item against the createManyResources item budget. See Templates. The response is the new Resource.

### `lk.resources.createMany` — Create many resources
`POST /api/v3/projects/{projectId}/resources/batch` · operationId `createManyResources`
- options: `idempotencyKey`
- body (ResourceBatchCreateParams):
  - `resources`: ResourceCreateParams[] (min 1, max 100) — 1–100 resources to create, each a ResourceCreateParams, created in this order. An item may name an earlier item of the same batch as its `parentId` when that ea…
- returns: 201 ResourceBatch
- notes: Creates several resources in order. Body is ResourceBatchCreateParams; each item is validated as createResource validates its body. Every item is checked before any is created: the first failing item's 4xx answers the request, with error paths under `resources[i]`, and nothing is created. A batch counts as one write request against the write limits. A server error part-way through keeps the items created before it; give each item an `id` so that a retry answers 409 DUPLICATE_ID for those.

### `lk.resources.delete` — Delete a resource
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}` · operationId `deleteResource`
- path: `resourceId`
- query:
  - `cascade`?: boolean
- returns: 204 no body
- notes: Marks the resource deleted. Its documents and properties go with it, and it leaves lists and search at once. A resource with child resources that are not deleted is deleted only with `cascade=true`; otherwise nothing is deleted. A caller who is not a project admin needs Can Edit or Full Access on the resource and, for a cascade, on every descendant it deletes; otherwise the request answers 403 FORBIDDEN and nothing is deleted.

### `lk.resources.get` — Get a resource
`GET /api/v3/projects/{projectId}/resources/{resourceId}` · operationId `getResource`
- path: `resourceId`
- returns: 200 Resource
- notes: The resource with its `documents` (Document summaries) and `properties` (PropertyBlocks). A resource the caller cannot reach, because it or an ancestor is hidden or denies access, answers 404 NOT_FOUND.

### `lk.resources.list` — List resources
`GET /api/v3/projects/{projectId}/resources` · operationId `listResources` · paginated
- query:
  - `cursor`?: string (maxLength 2048)
  - `limit`?: integer (minimum 1, maximum 100)
  - `parentId`?: string (maxLength 256)
- returns: 200 ResourceList
- notes: Lists a page of the project's resources as ResourceListItems, ordered by id. Pass `nextCursor` back as `cursor` for the next page. A caller who is not a project admin sees only resources reachable through non-hidden ancestors. Deleted resources are never listed.

### `lk.resources.move` — Move or reorder a resource
`POST /api/v3/projects/{projectId}/resources/{resourceId}/move` · operationId `moveResource`
- path: `resourceId`
- options: `idempotencyKey`
- body (ResourceMoveParams):
  - `parentId`?: string (maxLength 256) | null (maxLength 256) — The new parent resource id, or null for the root. `templates` makes the resource a top-level template; only a project admin may name it. Omitted, the resource s…
  - `after`?: string (maxLength 256) — Id of a sibling under the destination parent. The resource is placed directly after it. Sending both `after` and `before` answers 400 VALIDATION_ERROR. An ancho…
  - `before`?: string (maxLength 256) — Id of a sibling under the destination parent. The resource is placed directly before it. Sending both `after` and `before` answers 400 VALIDATION_ERROR. An anch…
- returns: 200 Resource
- notes: Moves a resource to another parent or reorders it among its siblings. Body is ResourceMoveParams. With neither `after` nor `before`, the resource goes after the last sibling. Children move with the resource. See Resource order. An empty body answers 400 VALIDATION_ERROR. A caller who is not a project admin needs Can Edit or Full Access on the resource and on the destination parent, and cannot move it to the root; otherwise nothing changes. The response is the full Resource.

### `lk.resources.restore` — Restore a deleted resource
`POST /api/v3/projects/{projectId}/resources/{resourceId}/restore` · operationId `restoreResource`
- path: `resourceId`
- options: `idempotencyKey`
- returns: 200 Resource
- notes: Restores a deleted resource together with every descendant deleted by the same operation, the descendants whose `deletedAt` equals the resource's. A descendant deleted separately stays deleted. A resource whose parent no longer exists is restored at the root, after the last root resource. Only project admins may restore; any other caller gets 404 NOT_FOUND for a resource it cannot view, which includes every deleted resource, and 403 FORBIDDEN otherwise. The response is the full Resource.

### `lk.resources.saveAsTemplate` — Save a resource as a template
`POST /api/v3/projects/{projectId}/resources/{resourceId}/save-as-template` · operationId `saveResourceAsTemplate`
- path: `resourceId`
- options: `idempotencyKey`
- body (ResourceSaveAsTemplateParams):
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id for the new template: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Ident…
  - `name`?: string (minLength 1, maxLength 500) — Name of the new template. Omitted, it is the resource's name.
  - `includeChildren`?: boolean — `true` also copies the resource's descendants the caller can view, keeping their tree. Default false. A copy holds at most 100 resources; a larger tree answers …
  - `after`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly after it. Mutually exclusive with `before`.
  - `before`?: string (maxLength 256) — Id of a sibling under the same parent. The resource is placed directly before it. Mutually exclusive with `after`.
- returns: 201 Resource
- notes: Creates a top-level template as a copy of the resource. Body is ResourceSaveAsTemplateParams; it may be empty. The copy takes the resource's fields, properties and documents with their content, under new ids. The resource itself does not change. Only project admins may call it. Each copied resource counts as one item against the createManyResources item budget. See Templates. The response is the new template as a Resource.

### `lk.resources.update` — Update a resource
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}` · operationId `updateResource`
- path: `resourceId`
- body (ResourceUpdateParams):
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
- returns: 200 Resource
- notes: Updates a resource. Body is ResourceUpdateParams. Only the fields sent change, and a value equal to the current one is not a change. An empty body answers 400 VALIDATION_ERROR. Only project admins may change `isHidden`. Changing `permissions` needs project admin or Full Access on the resource. A refused update answers 403 FORBIDDEN and changes nothing. The response is the full Resource.

## search

### `lk.search.search` — Full-text search across resources
`GET /api/v3/projects/{projectId}/search` · operationId `search` · list (single page)
- query:
  - `q`?: string (maxLength 500)
  - `limit`?: integer (minimum 1, maximum 100)
- returns: 200 SearchResultList
- notes: Resources whose name, aliases or content match `q`, best match first. A resource can appear once per matching document. A caller who is not a project admin gets only resources they can reach and no matches from hidden documents, and a public caller only public content.

## tags

### `lk.tags.list` — List the project's tags
`GET /api/v3/projects/{projectId}/tags` · operationId `listTags` · list (single page)
- returns: 200 TagList
- notes: Every distinct tag on the project's resources, with the number of resources that carry it, ordered by `count` descending and then by `tag`. Resources in the trash are not counted. The list is not paginated. Requires the ADMIN role.

## templates

### `lk.templates.list` — List templates
`GET /api/v3/projects/{projectId}/templates` · operationId `listTemplates` · paginated
- query:
  - `cursor`?: string (maxLength 2048)
  - `limit`?: integer (minimum 1, maximum 100)
- returns: 200 ResourceList
- notes: Lists a page of the project's templates as ResourceListItems, ordered by id: every live resource under the `templates` root, at any depth. A top-level template has `parentId` `templates`; a nested template has its parent template's id. Pass `nextCursor` back as `cursor` for the next page. Only project members may call it. See Templates.

## timelines

### `lk.timelines.createEvent` — Create an event
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/events` · operationId `createEvent`
- path: `resourceId`, `documentId`
- options: `idempotencyKey`
- body (EventCreateParams):
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
- returns: 201 Event
- notes: Creates an event on a lane of the timeline. Body is EventCreateParams. The new event is given a `rank`. A document that is not a timeline (`time`) answers 400 KIND_MISMATCH. A `blank` document has no lanes for `laneId` to name; create a lane first, which converts it to a timeline.

### `lk.timelines.createLane` — Create a lane
`POST /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/lanes` · operationId `createLane`
- path: `resourceId`, `documentId`
- options: `idempotencyKey`
- body (LaneCreateParams):
  - `id`?: string (maxLength 24, pattern ^[a-z](?:[0-9a-z]{7}|[0-9a-z]{23})$) — Optional client-chosen id: a lowercase letter followed by 7 or 23 lowercase letters or digits (a cuid2 id of 8 or 24 characters). See Identifiers.
  - `name`: string (maxLength 500) — Lane display name
  - `rank`: string (maxLength 65536) — Fractional index for ordering (e.g. "a0", "a1")
  - `size`: "sm" | "lg" — Lane height
  - `style`?: { color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$), imageUrl?: string (maxLength 2048), opacity?: number } — Lane visual style options
- returns: 201 Lane
- notes: Creates a lane on the timeline. Body is LaneCreateParams. A document that is not a timeline (`time`) or `blank` answers 400 KIND_MISMATCH. A write to a `blank` document converts it to a time document and saves the content in the same request. The document is given the default calendar (`gregorian`) and no lanes other than the one created.

### `lk.timelines.deleteEvent` — Delete an event
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/events/{eventId}` · operationId `deleteEvent`
- path: `resourceId`, `documentId`, `eventId`
- returns: 204 no body
- notes: Removes the event from its lane. A document that is not a timeline (`time`) answers 400 KIND_MISMATCH. A `blank` document has no lanes for `laneId` to name; create a lane first, which converts it to a timeline.

### `lk.timelines.deleteLane` — Delete a lane
`DELETE /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/lanes/{laneId}` · operationId `deleteLane`
- path: `resourceId`, `documentId`, `laneId`
- returns: 204 no body
- notes: Removes the lane and every event on it. A document that is not a timeline (`time`) or `blank` answers 400 KIND_MISMATCH.

### `lk.timelines.getEvent` — Get an event
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/events/{eventId}` · operationId `getEvent`
- path: `resourceId`, `documentId`, `eventId`
- returns: 200 Event
- notes: The event by id, with `formattedStart` and `formattedEnd` rendered in the document's calendar. A hidden event answers 404 NOT_FOUND to a caller who is not a project admin. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.timelines.getLane` — Get a lane
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/lanes/{laneId}` · operationId `getLane`
- path: `resourceId`, `documentId`, `laneId`
- returns: 200 Lane
- notes: The lane by id, from this document only; lanes of chained source timelines are not resolved here. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.timelines.listEvents` — List a timeline's events
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/events` · operationId `listEvents` · paginated
- path: `resourceId`, `documentId`
- query:
  - `cursor`?: string (maxLength 2048)
  - `limit`?: integer (minimum 1, maximum 100)
- returns: 200 EventList
- notes: A page of the timeline's events, including events of timelines the document chains as sources. Events are ordered by `start`, then by id, so events sharing a start time keep a stable order across pages. Pass `nextCursor` back as `cursor` for the next page. A caller who is not a project admin does not see hidden events. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.timelines.listLanes` — List a timeline's lanes
`GET /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/lanes` · operationId `listLanes` · list (single page)
- path: `resourceId`, `documentId`
- returns: 200 LaneList
- notes: Every lane of the timeline as a Lane (`id`, `name`, `rank`, `size`, `style`), including lanes of timelines the document chains as sources. The list is not paginated; order it by `rank`. A hidden document, or a document of a resource the caller cannot reach, answers 404 NOT_FOUND to a caller who is not a project admin.

### `lk.timelines.updateEvent` — Update an event
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/events/{eventId}` · operationId `updateEvent`
- path: `resourceId`, `documentId`, `eventId`
- body (EventUpdateParams):
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
- returns: 200 Event
- notes: Body is EventUpdateParams. Only the fields sent change. A document that is not a timeline (`time`) answers 400 KIND_MISMATCH. A `blank` document has no lanes for `laneId` to name; create a lane first, which converts it to a timeline.

### `lk.timelines.updateLane` — Update a lane
`PATCH /api/v3/projects/{projectId}/resources/{resourceId}/docs/{documentId}/lanes/{laneId}` · operationId `updateLane`
- path: `resourceId`, `documentId`, `laneId`
- body (LaneUpdateParams):
  - `name`?: string (maxLength 500)
  - `rank`?: string (maxLength 65536)
  - `size`?: "sm" | "lg"
  - `style`?: { color?: string (maxLength 7, pattern ^#[0-9A-Fa-f]{6}$), imageUrl?: string (maxLength 2048), opacity?: number } — Lane visual style options
- returns: 200 Lane
- notes: Body is LaneUpdateParams. Only the fields sent change. A document that is not a timeline (`time`) or `blank` answers 400 KIND_MISMATCH.
