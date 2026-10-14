# LegendKeeper SDK guide

This guide covers every capability of `@legendkeeper/sdk`, in the order you need them. The [quickstart](./README.md) installs the client and writes a first page. The [style guide](./STYLE.md) explains which fields and values to choose so that your content looks like content made in the app.

Every TypeScript example in this guide is a file in the package's `examples/` directory. The API test suite runs each one against a live server, so a broken example fails the build. Each example creates what it needs and deletes it before it exits, so you can run it as-is against your own project.

## Contents

1. [Getting started](#getting-started)
2. [Client options](#client-options)
3. [Errors](#errors)
4. [Rate limits and retries](#rate-limits-and-retries)
5. [Idempotent writes](#idempotent-writes)
6. [Pagination](#pagination)
7. [Versioned writes](#versioned-writes)
8. [Writing content](#writing-content)
9. [Namespaces and operations](#namespaces-and-operations)
10. [The CLI](#the-cli)
11. [The escape hatch](#the-escape-hatch)
12. [TypeScript types](#typescript-types)
13. [Worked example](#worked-example)

## Getting started

### Install

```sh
npm install @legendkeeper/sdk
```

The package has no runtime dependencies. It needs a global `fetch`, which Node 20 and later and edge runtimes provide. It ships ES module and CommonJS builds with type declarations.

### Get an API key

To create a key, open the project in LegendKeeper and go to Project Settings → Developers → API Keys. Enter a name, choose a role, and create the key. You need the ADMIN role to create a key.

The secret is shown once, when you create the key. Copy it then. The key list identifies each key by its name and `keyPrefix`.

API keys require the project owner to be on a paid plan. A trial does not count.

A key belongs to one project and has a role, `MEMBER` or `ADMIN`, chosen when you create it. Member is the default. A key acts as the user who created it, with the lower of the key's role and that user's current role in the project. If the creator is demoted from admin to member, the key acts as a member from then on.

A key that acts as a member follows the same rules as a member in the app. An integration that builds top-level content needs an `ADMIN` key.

A key acts only in its own project. A key in browser code is readable by anyone who loads the page, so call the API from a server you control.

Details:

- The operations marked "ADMIN role" in this guide return 403 `FORBIDDEN` to a key that acts as a member.
- A key created in Project Settings has at most the ADMIN role, so operations that only the project owner may call return 403 `FORBIDDEN` to it.

### Run the examples

Every example reads the key from `LEGENDKEEPER_API_KEY`. Most examples create resources at the root of the tree, so they expect an `ADMIN` key. To point the client at another server, such as a proxy or a mock server, set `LEGENDKEEPER_BASE_URL`. If it is unset, the client uses `https://www.legendkeeper.com`.

```sh
export LEGENDKEEPER_API_KEY=lk_...
npx tsx first-call.ts
```

The examples use top-level `await`, so they run as ES modules. Set `"type": "module"` in your `package.json`, or give the file an `.mts` extension. [tsx](https://tsx.is) runs TypeScript directly. You can also compile with `tsc` and run the output with `node`.

### Make a first call

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const project = await lk.project()
console.log(`Connected to ${project.name} (${project.id})`)

const resource = await lk.resources.create({ name: 'The Tree Fort' })
console.log(`Created ${resource.name} (${resource.id})`)

await lk.resources.delete({ resourceId: resource.id })
```

`new LegendKeeper({ apiKey })` makes no request. The first call does.

`lk.project()` returns the project the key belongs to. Every operation whose path starts with a project takes an optional `projectId`. If you omit it, the client fills it in from the key. The client looks up the project once, on the first call that needs it, and reuses it for the life of the client. Pass `projectId` yourself to skip that one request.

Without `documents`, a new resource starts with one document of type `blank` named `Main`. The first page, board, map or timeline write converts it to that type. See [documents](#documents).

Operations take up to two arguments:

- The first holds the path parameters, such as `resourceId` and `documentId`.
- The second holds everything else: query parameters, the request body, `ifMatch`, `idempotencyKey` and `signal`.

An operation whose only path parameter is `projectId` takes the options as its only argument, as `lk.resources.create({ name })` does above.

Details:

- The client resolves the project with one `projects.list` call the first time it needs it, and reuses the result for the life of the client.
- If the resolution fails, the client tries again on the next call.
- With a credential that reaches more than one project, resolution throws a `TypeError` that asks for an explicit `projectId`.

## Client options

```ts
import { ConnectionError, LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({
  apiKey: process.env.LEGENDKEEPER_API_KEY!,
  timeoutMs: 10_000,
  maxRetries: 3,
  fetch: async (url, init) => {
    const response = await fetch(url, init)
    console.log(init.method, url, response.status, response.headers.get('x-request-id'))
    return response
  },
})

const first = await lk.resources.list({ limit: 10, signal: AbortSignal.timeout(5_000) })
console.log(`${first.data.length} resources on the first page`)

const controller = new AbortController()
controller.abort()
try {
  await lk.resources.list({ signal: controller.signal })
} catch (error) {
  if (!(error instanceof ConnectionError)) throw error
  console.log(`aborted before a response arrived: ${error.message}`)
}
```

| Option | Default | Effect |
| --- | --- | --- |
| `apiKey` | required | Sent as `Authorization: Bearer <key>`. The constructor throws a `TypeError` without it. |
| `baseUrl` | `https://www.legendkeeper.com` | The host to send requests to, such as a proxy or a mock server in tests. |
| `timeoutMs` | `30000` | The time limit for each attempt, in milliseconds. Each retry starts a fresh limit. |
| `maxRetries` | `2` | How many times the client retries a failed request. `0` turns retries off. See [Rate limits and retries](#rate-limits-and-retries). |
| `fetch` | `globalThis.fetch` | The function that sends each request, with the signature `(url: string, init: RequestInit) => Promise<Response>`. The constructor throws a `TypeError` when neither exists. |
| `idempotencyKeys` | `true` | Whether every `POST` sends a generated `Idempotency-Key`. With `false`, a key you pass as `idempotencyKey` on a call is still sent. See [Idempotent writes](#idempotent-writes). |

A custom `fetch` sees every attempt, including retries. Use it to log, trace, add headers, or route requests through a proxy. It must return a `Response`.

Every call accepts an `AbortSignal` as `signal` in its options. When the signal aborts, for any reason, the call rejects with a `ConnectionError` and is not retried. If you set both `timeoutMs` and `signal`, the attempt ends at whichever comes first.

Every error the API returns has a `requestId`, the value of the response's `x-request-id` header. A `ConnectionError` has none. Include it when you report a problem. It identifies the server log line for the request.

Details:

- When the `baseUrl` option is absent, the client reads `LEGENDKEEPER_BASE_URL`, but only where `process.env` exists. Elsewhere, it uses production.
- An empty `LEGENDKEEPER_BASE_URL` counts as unset.
- An error thrown by a custom `fetch` becomes a `ConnectionError`.

## Errors

Every failed call throws. If the server returns an error status, the client throws a subclass of `LegendKeeperError`. If no response arrives, the client throws `ConnectionError`.

```ts
import { ConnectionError, LegendKeeper, LegendKeeperError, NotFoundError, ValidationError } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

async function report(attempt: () => Promise<unknown>): Promise<void> {
  try {
    await attempt()
    console.log('succeeded')
  } catch (error) {
    if (error instanceof ValidationError) {
      for (const issue of error.errors ?? []) console.log(`${error.code} at ${issue.path}: ${issue.message}`)
    } else if (error instanceof NotFoundError) {
      console.log(`${error.code}: ${error.message}`)
    } else if (error instanceof LegendKeeperError) {
      console.log(`${error.status} ${error.code ?? 'an unknown code'}; quote request ${error.requestId}`)
    } else if (error instanceof ConnectionError) {
      console.log(`no response: ${error.message}`)
    } else {
      throw error
    }
  }
}

await report(() => lk.resources.create({ name: '' }))
await report(() => lk.resources.list({ limit: 500 }))
await report(() => lk.resources.get({ resourceId: 'no-such-resource' }))
```

`LegendKeeperError` has these fields:

| Field | Value |
| --- | --- |
| `status` | The HTTP status. |
| `code` | One of the catalogue codes below, typed as `ErrorCode`. A code that this version of the SDK does not know reads as `undefined`. |
| `message` | A human-readable message. Its meaning is stable but its wording can change, so branch on `code`, not on `message`. |
| `errors` | On 400 `VALIDATION_ERROR`, `INVALID_CONTENT` and `UNSUPPORTED_KIND`, and on 409 `DUPLICATE_ID` from a block write, one `{ path, message }` per failing field or block. Otherwise `undefined`. |
| `requestId` | The `x-request-id` header, or the body's `requestId` when the header is absent. |
| `response` | The raw `Response`. |

`path` names the field or block in dotted form, such as `name`, `limit` or `block.children[0].level`. `walk` reports paths in the same form.

Details:

- A request body with an unknown field is rejected with `VALIDATION_ERROR` at that field's path, so a misspelled option is not ignored.

### Error classes

Each class matches a status, so an `instanceof` check and a `code` check agree.

| Status | Class | What to do |
| --- | --- | --- |
| 400 | `ValidationError` | Fix the request. `errors` identifies each failing field or block. Resending the same request fails the same way. |
| 401 | `AuthenticationError` | The key is missing, unknown, revoked or expired. Create a new key. |
| 403 | `PermissionError` | The key's role or the resource's permissions do not allow the operation, the operation does not accept API keys, or the path names another project. |
| 404 | `NotFoundError` | The entity does not exist, is deleted, or is hidden from the key's role. |
| 409 | `ConflictError` | The request conflicts with the entity's state. Read the entity again and decide. |
| 412 | `VersionMismatchError` | The document changed since you read it. Read it again and reapply your change. See [Versioned writes](#versioned-writes). |
| 429 | `RateLimitError` | A rate limit is exhausted. The client has already retried any wait of 8 seconds or less. Wait `retryAfterMs`, when present, before you try again. |
| 5xx | `ServerError` | The server failed. Report the `requestId`, which identifies the server log line. |
| other | `LegendKeeperError` | Any other status, including 402, 405, 413 and 422. Branch on `code`. |

`VersionMismatchError` adds `currentVersion`, the version parsed from the message, which can be `undefined`. `RateLimitError` adds `retryAfterMs`, read from `Retry-After`.

`ConnectionError` means no response arrived: a DNS, TCP or TLS failure, a timeout, or an abort. It is not a `LegendKeeperError`. Its `cause` is the underlying error, with the `name` `TimeoutError` for the client's timeout. For an abort through `signal`, it is the signal's `reason`.

### Error codes

Every error response from the API has the body `{ message, code, requestId, errors? }`. Each `code` has exactly one status.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | The body or query fails the schema. `errors[].path` identifies each field. |
| 400 | `INVALID_CONTENT` | The block tree is schema-valid but the editor cannot hold it. |
| 400 | `UNSUPPORTED_KIND` | The request creates an `unsupported` block or property, or echoes an unsupported id the document does not have. |
| 400 | `KIND_MISMATCH` | The target document, block or calendar is not a kind the route accepts. |
| 401 | `UNAUTHENTICATED` | No credential, or an unknown, revoked or expired key. |
| 402 | `SUBSCRIPTION_LAPSED` | The project owner's plan does not allow the write. |
| 402 | `PAID_PLAN_REQUIRED` | The project owner is not on a paid plan. |
| 403 | `FORBIDDEN` | The caller is not a member with the required role. |
| 403 | `WRONG_PROJECT` | The key's project is not the path's project. |
| 403 | `INSUFFICIENT_SCOPE` | The key lacks a scope the operation requires. |
| 403 | `FEATURE_UNAVAILABLE` | The request uses a field of a feature that is not available yet. |
| 404 | `NOT_FOUND` | A missing entity, including a placement anchor. |
| 405 | `METHOD_NOT_ALLOWED` | The path exists, but the method does not. |
| 409 | `DUPLICATE_ID` | A supplied id already exists. On a block write, `errors[].path` identifies the field. |
| 409 | `AMBIGUOUS` | A block id occurs more than once in a legacy document. |
| 409 | `ALREADY_DELETED` | The entity is already deleted. |
| 409 | `HAS_CHILDREN` | The resource has child resources that are not deleted. Pass `cascade=true` to delete them too. |
| 409 | `NOT_DELETED` | The entity to restore is not deleted. |
| 409 | `PARENT_DELETED` | The resource's parent is deleted. Restore the parent first. |
| 409 | `IN_PROGRESS` | A prior operation on the entity has not finished. |
| 409 | `IDEMPOTENCY_KEY_REUSED` | The idempotency key was used for a different request. |
| 409 | `TOO_MANY_PENDING_INVITES` | The project has the maximum number of pending invites. |
| 412 | `VERSION_MISMATCH` | `If-Match` does not equal the current version. |
| 422 | `DOCUMENT_TOO_LARGE` | The write would grow the document past its size limit. Delete content before you add more. |
| 413 | `PAYLOAD_TOO_LARGE` | Reserved. A request body over 1 MB is refused by the host before the API runs. That response is plain text, so the error has `status` 413 and no `code` or `requestId`. |
| 413 | `STORAGE_QUOTA_EXCEEDED` | The project owner's storage quota is reached. |
| 429 | `RATE_LIMITED` | A key or project tier is exhausted. See `Retry-After`. |
| 429 | `UPLOAD_RATE_EXCEEDED` | The upload tier is exhausted. |
| 500 | `INTERNAL` | An unexpected failure. |

`ERROR_CODES` exports the codes as an array, and `ErrorCode` is their union type. TypeScript checks a `switch (error.code)` for exhaustiveness.

Details:

- A `blank` document does not fail with `KIND_MISMATCH`. The first page, board, map or timeline write converts it to that type, as [documents](#documents) describes.

## Rate limits and retries

```ts
import { LegendKeeper, RateLimitError } from '@legendkeeper/sdk'

const maxRetries = 4

const lk = new LegendKeeper({
  apiKey: process.env.LEGENDKEEPER_API_KEY!,
  maxRetries,
  fetch: async (url, init) => {
    const response = await fetch(url, init)
    const remaining = response.headers.get('x-ratelimit-remaining')
    const reset = response.headers.get('x-ratelimit-reset')
    if (remaining !== null && reset !== null) {
      console.log(`${remaining} left in the window that resets at ${new Date(Number(reset) * 1000).toISOString()}`)
    }
    return response
  },
})

try {
  const page = await lk.resources.list({ limit: 5 })
  console.log(`read ${page.data.length} resources`)
} catch (error) {
  if (!(error instanceof RateLimitError)) throw error
  console.log(`still limited after ${maxRetries} retries; the server asks for ${error.retryAfterMs} ms`)
}
```

### Rate limits

API-key requests are counted in six tiers. A request that exhausts any tier returns 429 with `code: "RATE_LIMITED"`. The client retries it and throws `RateLimitError` when its retries run out.

| Scope | Window | Limit |
| --- | --- | --- |
| Writes (POST, PUT, PATCH, DELETE), per key | 1 minute | 120 |
| Writes (POST, PUT, PATCH, DELETE), per key | 1 hour | 3,000 |
| All requests, per key | 1 minute | 300 |
| All requests, per key | 1 hour | 6,000 |
| All requests, per key | 1 day | 60,000 |
| All requests, per project across keys | 1 hour | 12,000 |

Every key of a project shares the per-project tier, so one busy key slows the others.

Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` for the tier with the fewest requests remaining. The client does not expose response headers on a successful call. Read them through a custom `fetch`, as the example does.

A bulk import reaches the write limit of 120 a minute first. Space writes at least half a second apart, or let the client wait and retry. An import of more than 3,000 writes also reaches the limit of 3,000 writes an hour; space those writes 1.2 seconds apart.

To create many resources, use [`resources.createMany`](#creating-many-resources). One call creates up to 100 resources and counts as one write. Its items count against a separate budget of 600 items a minute and 6,000 an hour.

### Retries

The client retries a failed attempt up to `maxRetries` times:

- `GET`, `PUT`, `PATCH` and `DELETE` are retried on 429, 502, 503 and 504, on a timeout, and on a connection failure.
- `POST` is retried in the same cases, because every `POST` sends an `Idempotency-Key` and every attempt of one call sends the same key. It is also retried on 409 `IN_PROGRESS`, which the server returns while an earlier attempt with that key is still running. See [Idempotent writes](#idempotent-writes).
- A request aborted through `signal`, a 500, and any 4xx other than 429 are never retried.

Before a retry, the client waits for the `Retry-After` value when the response has one. A 429 or 503 whose `Retry-After` is longer than 8 seconds is not retried: the call throws at once, and the error's `retryAfterMs` says how long to wait. Without `Retry-After`, the client uses an exponential backoff with jitter: the first wait is 250–500 ms, and each later wait doubles, up to 8 seconds.

Details:

- A `POST` without a key is retried only on 429 and on a connection failure. A `POST` has no key only with `idempotencyKeys: false` and no `idempotencyKey` on the call.
- A `POST` without a key that timed out or returned 502, 503 or 504 is not retried, because the server may have applied it.
- 409 `IN_PROGRESS` is retried only on a request that has a key.
- When `Retry-After` exceeds 8 seconds, the client waits 8 seconds. A request that meets a spent per-minute tier can then exhaust its retries and throw `RateLimitError`. Its `retryAfterMs` says how long to wait.

## Idempotent writes

```ts
import { ConflictError, LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({
  apiKey: process.env.LEGENDKEEPER_API_KEY!,
  fetch: async (url, init) => {
    const response = await fetch(url, init)
    const headers = new Headers(init.headers)
    const key = headers.get('idempotency-key')
    if (key !== null) console.log(`${init.method} with key ${key}, replayed: ${response.headers.get('idempotent-replay') ?? 'false'}`)
    return response
  },
})

const key = `import-gunter-${Date.now()}`
const gunter = await lk.resources.create({ name: 'Gunter', tags: ['Penguin'], idempotencyKey: key })
try {
  const again = await lk.resources.create({ name: 'Gunter', tags: ['Penguin'], idempotencyKey: key })
  console.log(`one resource: ${again.id === gunter.id}`)

  try {
    await lk.resources.create({ name: 'Gunther, Destroyer of Worlds', idempotencyKey: key })
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error
    console.log(`${error.status} ${error.code}`)
  }

  const orgalorg = await lk.resources.create({ name: 'Orgalorg', parentId: gunter.id })
  await lk.resources.delete({ resourceId: orgalorg.id })
} finally {
  await lk.resources.delete({ resourceId: gunter.id })
}
```

An `Idempotency-Key` header makes a `POST` safe to send twice. The server stores the response to the first request with a key. A later request with the same key and body gets that stored response, and the write does not run again. If a create times out or its connection drops, send it again and it still creates one entity.

The client sends a key on every `POST` operation. It generates one UUID per call and sends that key on every retry of the call, so the retries described in [Retries](#retries) never write twice. `PUT`, `PATCH` and `DELETE` send no key, because sending one of them twice leaves the same stored result. The second response can still differ: a retried `DELETE` whose first attempt was applied returns 404 or 409 `ALREADY_DELETED`, and a retried `ifMatch` write returns 412. Read the entity before you treat either as a failure.

To send your own key, pass `idempotencyKey` in a `POST` call's options. A key derived from your own data, such as `import-row-42`, makes a whole script safe to rerun. A second run of an import replays the first run's creates instead of making a second copy of each row.

To stop the generated key, set `idempotencyKeys: false` in the client options. A key passed as `idempotencyKey` is still sent. Only operations that send `POST` accept `idempotencyKey`.

| Situation | Answer |
| --- | --- |
| First request with a key | The write runs. A 2xx response, or a 4xx response other than the refusals listed below, is stored under the key. |
| Same key, same method, path and body | The stored status and body, with `Idempotent-Replay: true` and `Idempotent-Original-Request-Id` set to the first request's `x-request-id`. Nothing is written. |
| Same key while the first request is still running | 409 `IN_PROGRESS`. The client waits and retries up to `maxRetries` times, and receives the stored response once the first request finishes. If the first request is still running after those retries, the call throws `ConflictError` with `IN_PROGRESS`; retry later with the same key. |
| Same key, different method, path or body | 409 `IDEMPOTENCY_KEY_REUSED`, thrown as `ConflictError`. Nothing is written. Use a new key for a different request. |
| The first request was refused before any write: 400 `VALIDATION_ERROR`, 401, 403 or 404 | Nothing is stored, and the key is released. You can send the corrected request with the same key. |
| The first request answered 5xx or 429 | Nothing is stored, and the key is released. A retry with the key runs the write again. |

Details:

- The server keeps the response for each key for 24 hours.
- The server compares bodies after sorting their keys, so the same fields in a different order count as the same body.
- A replay returns the response exactly as it was, so a create replayed after the entity was deleted still returns the created entity.
- A replayed 4xx is thrown again.
- The stored 4xx responses include 409 `DUPLICATE_ID`, 400 `KIND_MISMATCH`, 412 `VERSION_MISMATCH` and 422 `DOCUMENT_TOO_LARGE`. The comparison does not include `If-Match`, so after a 412, re-read the version and send the write with a new key.
- A key is 1–255 characters from `A-Z`, `a-z`, `0-9`, `.`, `_` and `-`. Any other key returns 400 `VALIDATION_ERROR`.
- Keys are scoped to the API key that sent them.
- A response body larger than 64 KiB is not stored. A retry with the same key runs the write again.
- `lk.request` sends no generated key. To send one, put `Idempotency-Key` in its `headers`.
- A `POST` through `lk.request` with that header is retried like any other `POST` with a key, and one without it follows the rule for a `POST` without a key.

## Pagination

```ts
import { LegendKeeper, type Page, type components } from '@legendkeeper/sdk'

type ResourceListItem = components['schemas']['ResourceListItem']

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
const kingdoms: string[] = []
try {
  for (const name of ['Candy Kingdom', 'Ice Kingdom', 'Fire Kingdom', 'Lumpy Space', 'Wildberry Kingdom']) {
    kingdoms.push((await lk.resources.create({ name, parentId: ooo.id })).id)
  }

  for await (const kingdom of await lk.resources.list({ parentId: ooo.id, limit: 2 })) {
    console.log(kingdom.name)
  }

  for await (const member of await lk.members.list()) {
    console.log(member.id, member.role)
  }

  let page: Page<ResourceListItem> | null = await lk.resources.list({ parentId: ooo.id, limit: 2 })
  while (page !== null) {
    console.log(page.data.map((kingdom) => kingdom.name).join(', '), page.hasMore ? 'then more' : 'and no more')
    page = await page.next()
  }

  const documents = await lk.documents.list({ resourceId: ooo.id })
  console.log(`${documents.data.length} documents, hasMore ${documents.hasMore}, nextCursor ${documents.nextCursor}`)
} finally {
  for (const id of kingdoms) await lk.resources.delete({ resourceId: id })
  await lk.resources.delete({ resourceId: ooo.id })
}
```

Every list operation returns a `Page`, and so does `search.search`. A `Page` has:

- `data`: the items on this page.
- `hasMore`: whether another page follows.
- `nextCursor`: the cursor for the next page, or `null`.
- `next()`: fetches the next page, or resolves `null` after the last one.
- `[Symbol.asyncIterator]`: `for await` over a page yields every item from this page to the end of the collection, fetching as it goes.

Use `for await` to read a whole collection. Use `next()` to handle one page at a time. Each call to `next()` sends a request, so keep the page it returns instead of calling it twice.

Server-paged lists: `assets.list`, `projects.list`, `resources.list`, `templates.list`, `timelines.listEvents`.

These lists take `limit`, the page size, and `cursor`. A cursor is opaque: send back the `nextCursor` you received, never one you built or parsed.

Every other list returns the whole collection in one page with `hasMore` false and `nextCursor` null, so the same `for await` loop works on every list. The example reads `members.list`, which is not paged, with that loop.

Details:

- A cursor the endpoint did not issue returns 400 `VALIDATION_ERROR` with the field in `errors[].path`.
- `search.search` returns one page.
- Items added while you page may or may not appear, depending on where they sort.

## Versioned writes

```ts
import { LegendKeeper, VersionMismatchError } from '@legendkeeper/sdk'
import { p } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const lsp = await lk.resources.create({ name: 'Lumpy Space Princess' })
try {
  const page = lsp.documents[0]!
  const doc = { resourceId: lsp.id, documentId: page.id }

  const read = await lk.documents.getBlocks(doc)
  const written = await lk.documents.replaceBlocks(doc, { blocks: [p('Lives in Lumpy Space. Oh my glob.')], ifMatch: read.version })
  console.log(`read at ${read.version}, written at ${written.version}`)

  try {
    await lk.documents.replaceBlocks(doc, { blocks: [p('Lives in the woods now. Whatever.')], ifMatch: read.version })
  } catch (error) {
    if (!(error instanceof VersionMismatchError)) throw error
    console.log(`rejected; the document is at ${error.currentVersion}`)
    const fresh = await lk.documents.getBlocks(doc)
    const merged = await lk.documents.replaceBlocks(doc, {
      blocks: [...fresh.blocks, p('Moved to the woods after a fight with her parents.')],
      ifMatch: fresh.version,
    })
    console.log(`${merged.blocks.length} blocks at ${merged.version}`)
  }
} finally {
  await lk.resources.delete({ resourceId: lsp.id })
}
```

Page content is versioned. `documents.getBlocks`, `blocks.get` and every write that takes `ifMatch` return the document's `version`. A write returns the version the document has after it. The version is an opaque string, so compare it only for equality.

Pass a version back as `ifMatch` on a write. The server applies the write only if the document is still at that version. Otherwise it returns 412, and the client throws `VersionMismatchError`. Without `ifMatch`, the write overwrites any edit made since your read, in the app or by another client.

These operations take `ifMatch`:

- `documents.replaceBlocks`
- Every `blocks` write
- The row writes on sidebar properties: `properties.createRow`, `properties.updateRow` and `properties.deleteRow`
- Every `boards` write

On a mismatch, read the document again, reapply your change to what you read, and write with the new version. `VersionMismatchError.currentVersion` has the version the server reported, when it can be parsed from the message. Reading again is the reliable path, since you need the new content anyway.

Details:

- A board has its own `version`, which `boards.getContent`, `boards.listShapes` and every board write return.
- Calendars have a `version` as well. See [Calendars](#calendars).
- The client copies the `ETag` header into `version` when the body lacks it.
- A write that returns no body, such as `blocks.delete`, returns no version. Read the document to get the next one.

## Writing content

### The block model

For a page's plain text, read `text` from `documents.getBlocks`.

A page is a tree of typed blocks. Every block has a `kind` and the fields of that kind. Container kinds have `children`, and text kinds have `content`. `content` is an array of runs. A run is text with optional marks, a mention of a resource, or a line break.

`@legendkeeper/sdk/blocks` exports one builder per kind, helpers for runs and marks, readers for what comes back, and the kind enums. The builders return plain objects, so you can also write the objects by hand.

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import {
  bold, br, callout, code, collection, column, expand, findBlock, h, image, infobox, italic, keyValue, layout, li, link,
  links, mention, meter, mono, ol, p, plainText, property, quote, rule, secret, table, task, tasks, td, th, tr, ul, walk,
} from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const flagPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const flag = await lk.assets.uploadImage({ data: flagPng, contentType: 'image/png', name: 'The Candy Kingdom flag' })
const kingdom = await lk.resources.create({ name: 'Candy Kingdom' })
const pb = await lk.resources.create({ name: 'Princess Bubblegum' })
try {
  const page = kingdom.documents[0]!
  const doc = { resourceId: kingdom.id, documentId: page.id }

  const written = await lk.documents.replaceBlocks(doc, {
    blocks: [
      infobox(
        [
          property(image(flag.url!, { alt: 'The Candy Kingdom flag', fill: true }), { title: 'Flag', isTitleHidden: true }),
          property(keyValue([['Citizens', 'Candy People'], ['Founded', 'After the Mushroom War']]), { title: 'Facts' }),
          property(links([pb.id]), { title: 'Ruler' }),
        ],
        { layout: 'wrapRight', width: 40 },
      ),
      h(1, 'Candy Kingdom'),
      p('A kingdom of candy people, ruled by ', mention({ resourceId: pb.id }), ', who is mostly science.'),
      p('Guarded ', italic('badly'), ' by ', link('https://example.com/banana-guards', 'the Banana Guards'), '.', br, 'Their password: ', mono('I am a banana')),
      callout('warning', ['Do not let the Earl of Lemongrab in. UNACCEPTABLE.']),
      h(2, 'Rulers'),
      collection({ items: [pb.id], isTitleHidden: true }),
      h(2, 'Landmarks'),
      ul('Candy Castle', li('Candy Village', ol(['Cinnamon Bun’s house', 'The Candy Kingdom Hospital']))),
      tasks(task(true, 'Rebuild the castle after the Lich'), task(false, 'Tell the Candy People about the Lich')),
      table(tr(th(['Kingdom']), th(['Ruler'])), tr(td(['Ice Kingdom']), td(['The Ice King'])), tr(td(['Fire Kingdom']), td(['Flame Princess']))),
      layout(column(50, 'Exports: candy, science.'), column(50, 'Imports: nothing. She makes it.')),
      expand('Where she came from', quote('A Candy Elemental, grown from the Mother Gum after the Mushroom War.')),
      meter('bar', [{ name: 'Sugar reserves', icon: 'candy-cane', current: 6, max: 10, color: '#ff69b4' }]),
      secret('Peppermint Butler knows dark magic.'),
      code('bubblegum --analyze candy-person', 'bash'),
      rule(),
    ],
  })

  console.log(`${written.blocks.length} top-level blocks at version ${written.version}`)
  console.log(plainText(written) === written.text)
  walk(written, (block, path) => console.log(path, block.kind))
  const introId = written.blocks[2]?.id
  if (!introId) throw new Error('the intro paragraph has an id')
  console.log(findBlock(written, introId)?.kind)
} finally {
  await lk.resources.delete({ resourceId: kingdom.id })
  await lk.resources.delete({ resourceId: pb.id })
  await lk.assets.delete({ assetId: flag.id })
}
```

The example uploads the flag with `assets.uploadImage` first, because an image takes only the `url` of an image asset of the project (see [Image URLs](#image-urls)).

`documents.replaceBlocks` replaces the whole tree and returns it with ids and the new version. `documents.getBlocks` reads it. Both return `DocumentBlocks`, which has these fields:

- `id` and `version`.
- `schema`, the block model version (`1`).
- `blocks`, the block tree.
- `text`, the document's plain text, with one line per text-bearing block.

Block ids are stable. A block written with an `id` keeps it, and a block written without one gets a new id. Reads always include ids. Use an id to address a block in `blocks.get`, `blocks.update`, `blocks.replace`, `blocks.move` and `blocks.delete`, and in the `after`, `before` and `parent` placement anchors.

The examples read block ids from the write response. `documents.replaceBlocks` returns the written tree with ids, and `blocks.insert` returns the inserted block with its id. To set a chosen id, use `withId`. Scripts that rebuild a known layout with `documents.replaceBlocks` use it to keep the same ids on every run.

Details:

- A mention reads as its `text` label, or else its resource's `name`. `name` is read-only.

### Builders

| Builder | Writes |
| --- | --- |
| `p(...text)` | A paragraph of runs. |
| `h(level, ...text)` | A heading at level 1 through 6. |
| `quote(first, ...rest)` | A block quote with at least one child. |
| `code(text, language?)` | A code block of plain text. |
| `rule()` | A horizontal rule. |
| `ul(first, ...rest)` | An unordered list of at least one item. A string, or an array of strings and runs such as `['Escort ', mention({ resourceId: pb.id }), ' home']`, is a one-paragraph item. |
| `ol(items, { start? })` | A numbered list of at least one item, starting at `start`. Items take the same forms as in `ul`. |
| `li(first, ...rest)` | One list item. `first` is inline content or a paragraph, and the rest can be nested lists. |
| `tasks(first, ...rest)` | A checklist of at least one task item or nested checklist. |
| `task(checked, ...text)` | One checklist entry. |
| `table(first, ...rest)` | A table of at least one row. |
| `tr(...cells)` | One table row. |
| `td(children, { colspan?, rowspan? })` | One table cell. |
| `th(children, { colspan?, rowspan? })` | One header cell. |
| `callout(tone, children, { icon?, color? })` | A callout in a `CalloutTone`: `info`, `note`, `success`, `warning`, `error` or `custom`. The first five use the app's icon and color for that tone. `custom` uses `icon` (a Font Awesome name) and `color` (`#RRGGBB`). `icon` or `color` with any other tone returns 400 `VALIDATION_ERROR`. |
| `expand(title, ...children)` | A collapsible section. |
| `layout(first, second, third?)` | A row of two or three columns. |
| `column(width?, ...children)` | One layout column. A leading number is a percentage width. |
| `image(url, alt?)` | An image by the `url` of an image asset of the project (see [Image URLs](#image-urls)). The second argument is alt text or `{ alt?, fill?, title?, isTitleHidden?, layout?, width? }`. `fill: true` draws the image edge to edge with no frame (see [Block titles and image fill](#block-titles-and-image-fill)). |
| `embed(provider, url, { title?, isTitleHidden?, layout?, width? })` | An embedded player from an `EmbedProvider`. Use a URL from that provider; the API accepts any `http` or `https` URL and does not check the host. |
| `keyValue(rows, { display?, title?, isTitleHidden?, layout?, width? })` | Key-value rows, as `[key, text]` tuples or objects, drawn in the `display` variant. |
| `infobox(...properties)` | An infobox whose rows are PropertyBlocks. Pass the rows as an array to add `{ layout?, width? }`. |
| `meter(mode, items, { showText?, showIcon?, showMax?, title?, isTitleHidden?, layout?, width? })` | Tracked values drawn in a `MeterMode`. Each item has `name`, `icon`, `current`, `max` and an optional `color`: `#RRGGBB`, or `none` (the default) for the block tint. |
| `links(items, { title?, isTitleHidden?, layout?, width? })` | A list of links. A string is a resource id. |
| `collection({ items?, filter?, title?, isTitleHidden?, layout?, width? })` | A resource collection by `items` or `filter`. Give a collection with no meaningful name `isTitleHidden: true`. |
| `map({ resourceId, documentId }, { viewport?, displayHeight?, fill?, title?, isTitleHidden?, layout?, width? })` | An interactive map of a `map` document of the project (see [Maps in pages](#maps-in-pages)). |
| `secret(...children)` | Content hidden from players. Pass the children as an array to add `{ layout?, width? }`. |
| `textField(...children)` | A rich-text container, used as a property body. Pass the children as an array to add `{ title?, isTitleHidden?, layout?, width? }`. |
| `withId(id, block)` | The same block with an explicit id. |
| `property(block, envelope?)` | A PropertyBlock: a property-capable block plus `title`, `isTitleHidden` and `isHidden`. The envelope defaults to `{}`. |

A string in a children argument is shorthand for a paragraph. Builders with an options bag take children as an array, and the others take them as trailing arguments. If a kind requires children, its builder takes the first child as a required argument, so the empty form does not compile.

### Layout and width

The kinds the editor lays out (`image`, `embed`, `keyValue`, `meter`, `resourceCollection`, `resourceLink`, `map`, `secret`, `textField` and `infobox`) have `layout` and `width`. `layout` is one of `default`, `wrapLeft`, `wrapRight`, `center`, `alignStart` and `alignEnd`. `wrapLeft` and `wrapRight` float the block so the blocks after it wrap beside it. `width` is a percentage of the column, 10 to 100, and applies when `layout` is not `default`.

A new infobox floats right at `width` 40, and every other kind is full width. On a replace or an update, an omitted field keeps its current value. You can write back a block you read without losing the layout it has in the editor.

A block's title and an image's `fill` also change how the block is drawn. See [Block titles and image fill](#block-titles-and-image-fill).

### Block titles and image fill

The kinds the app draws with a label above them (`image`, `embed`, `keyValue`, `meter`, `resourceCollection`, `resourceLink`, `map` and `textField`) have `title` and `isTitleHidden`. `title` is the label, up to 256 characters. `isTitleHidden: true` hides the label and the frame around the block, like "Hide title" in the app. `secret` and `infobox` have neither field.

A block written without these fields gets its kind's defaults:

| Kind | Default `title` | Default `isTitleHidden` |
| --- | --- | --- |
| `image` | `Image` | `true` |
| `embed` | `Embed` | `true` |
| `keyValue` | `Stats` | `false` |
| `meter` | `Meter` | `false` |
| `resourceCollection` | `Collection` | `false` |
| `resourceLink` | `Links` | `false` |
| `map` | `Map` | `false` |
| `textField` | `Text` | `false` |

Hide a collection's title unless the title names the collection and does not repeat the heading above it. The example hides the title of the collection under the "Residents" heading and gives the second collection its own title. It then shows the first collection's title with `blocks.update`:

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { collection, h, image, infobox, p, property } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const portraitPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const portrait = await lk.assets.uploadImage({ data: portraitPng, contentType: 'image/png', name: 'The Tree Fort' })
const treeFort = await lk.resources.create({ name: 'The Tree Fort' })
const finn = await lk.resources.create({ name: 'Finn the Human' })
const jake = await lk.resources.create({ name: 'Jake the Dog' })
try {
  const doc = { resourceId: treeFort.id, documentId: treeFort.documents[0]!.id }
  const written = await lk.documents.replaceBlocks(doc, {
    blocks: [
      infobox(property(image(portrait.url!, { alt: 'The Tree Fort', fill: true }), { title: 'Portrait', isTitleHidden: true })),
      p('A hollow tree in the Grasslands, home to two heroes.'),
      h(2, 'Residents'),
      collection({ items: [finn.id, jake.id], isTitleHidden: true }),
      collection({ items: [jake.id], title: 'Can stretch', isTitleHidden: false }),
    ],
  })
  for (const block of written.blocks) {
    if (block.kind === 'resourceCollection') console.log(block.title, block.isTitleHidden)
  }

  const residents = written.blocks[3]
  if (!residents?.id) throw new Error('the residents collection has an id')
  const shown = await lk.blocks.update({ ...doc, blockId: residents.id }, { title: 'Everyone', isTitleHidden: false, ifMatch: written.version })
  if (shown.kind === 'resourceCollection') console.log(shown.title, shown.isTitleHidden)
} finally {
  await lk.resources.delete({ resourceId: treeFort.id })
  await lk.resources.delete({ resourceId: finn.id })
  await lk.resources.delete({ resourceId: jake.id })
  await lk.assets.delete({ assetId: portrait.id })
}
```

Set `fill: true` on an image to draw it edge to edge with no frame or title, like "Fill block" in the app. `fill` applies while `isTitleHidden` is true, which is the default for a new image.

Inside a property, `title` and `isTitleHidden` are fields of the property envelope, and an image property takes `fill` the same way. For example, a portrait at the top of an infobox is `property(image(url, { fill: true }), { title: 'Portrait', isTitleHidden: true })`.

Details:

- `fill` has no default. A replace that omits `fill` removes it, as it does `alt`.

### Runs and marks

| Helper | Writes |
| --- | --- |
| `runs(text)` | Normalizes a string, a run or a nested array into a run array. |
| `bold(...text)` | Bold text. |
| `italic(...text)` | Italic text. |
| `underline(...text)` | Underlined text. |
| `strike(...text)` | Struck-through text. |
| `mono(...text)` | Inline code. It clears every other mark, and later marks skip a mono run. |
| `sub(...text)` | Subscript. It clears `sup`. |
| `sup(...text)` | Superscript. It clears `sub`. |
| `link(href, ...text)` | Linked text. |
| `mention({ resourceId, documentId?, text? })` | A run array with one mention run, like the other run helpers. |
| `br` | A line break run. |

Mark helpers nest: `bold(italic('Mathematical!'))` is bold italic text. Text arguments accept strings, runs and arrays of either, so `p('What time is it? ', bold('Adventure time'), '!')` needs no wrapping.

### Readers

| Reader | Returns |
| --- | --- |
| `plainText(input)` | The text of a block, a list of blocks or a document, derived the same way as `DocumentBlocks.text`. |
| `walk(input, visitor)` | Calls the visitor for every block with its dotted path, such as `blocks[0].children[1]`. It descends into `children` and infobox `rows`. |
| `findBlock(input, id)` | The first block with that id, or `undefined`. |

### Enums

`BlockKind`, `BlockLayout`, `CalloutTone`, `EmbedProvider`, `KeyValueDisplay`, `MeterMode` and `PropertyKind` are `as const` objects with matching union types. Use them for readable comparisons, such as `block.kind === BlockKind.heading`.

### Block operations

The single-block operations read and change one block and its subtree by id.

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { bold, h, p, runs, ul } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const fort = await lk.resources.create({ name: 'The Tree Fort' })
try {
  const page = fort.documents[0]!
  const doc = { resourceId: fort.id, documentId: page.id }

  const written = await lk.documents.replaceBlocks(doc, { blocks: [h(1, 'The Tree Fort'), ul('Treasure room', 'BMO’s charging nook')] })
  const [titleId, roomsId] = written.blocks.map((block) => block.id)
  if (!titleId || !roomsId) throw new Error('the written blocks have ids')
  let { version } = written

  const intro = await lk.blocks.insert(doc, { block: p('Where Finn and Jake live.'), after: titleId, ifMatch: version })
  if (!intro.id) throw new Error('the inserted block has an id')
  const introId = intro.id
  version = intro.version

  const updated = await lk.blocks.update(
    { ...doc, blockId: introId },
    { content: runs(['Where Finn and Jake live, with ', bold('BMO'), '.']), ifMatch: version },
  )
  version = updated.version

  const replaced = await lk.blocks.replace({ ...doc, blockId: titleId }, { ...h(2, 'The Tree Fort, home of heroes'), ifMatch: version })
  version = replaced.version

  const moved = await lk.blocks.move({ ...doc, blockId: roomsId }, { before: introId, ifMatch: version })
  version = moved.version

  const rooms = await lk.blocks.get({ ...doc, blockId: roomsId })
  console.log(rooms.kind, rooms.version === version)

  await lk.blocks.delete({ ...doc, blockId: roomsId }, { ifMatch: version })

  const { assigned } = await lk.documents.assignBlockIds(doc)
  console.log(`${assigned} blocks lacked an id`)

  const final = await lk.documents.getBlocks(doc)
  console.log(final.blocks.map((block) => `${block.id}: ${block.kind}`).join('\n'))
} finally {
  await lk.resources.delete({ resourceId: fort.id })
}
```

| Operation | Does |
| --- | --- |
| `blocks.insert` | Inserts `block` after or before an anchor block, or as the last child of a `parent` container. With no anchor, it appends to the end of the document. An id in the block is kept. |
| `blocks.get` | Returns the block with its subtree. |
| `blocks.update` | Changes the block's own fields, such as `content`, `level`, `checked`, `tone`, `layout` or `width`. Children stay as they are. |
| `blocks.replace` | Replaces the block and its subtree. The block keeps its id, and ids from the old subtree are kept when echoed. |
| `blocks.move` | Moves the block and its subtree to exactly one of `after`, `before` or `parent`. Ids are kept. |
| `blocks.delete` | Removes the block and its subtree. |
| `documents.assignBlockIds` | Gives an id to every block that lacks one, and returns the count `assigned` and the new `version`. Documents written in the app before block ids existed lack them. Run this once before you address their blocks. |

### Rejected writes

Every block write validates the whole resulting document. A rejected write changes nothing and returns one of the codes below. Its `errors` array has a `path` for the offending block, in the same dotted form that `walk` reports.

| Code | Meaning |
| --- | --- |
| `VALIDATION_ERROR` | The block does not match the schema. For example: an unknown `kind`, an unknown field, a missing required field, or a `rank` in a property create body. |
| `UNSUPPORTED_KIND` | The write has `kind: "unsupported"` for an id the document does not hold. |
| `INVALID_CONTENT` | The block is well formed, but the editor cannot hold it there. For example, a `listItem` at the top level, or a list inside an `expand` inside a table cell. |
| `KIND_MISMATCH` | The document is not a page, or a row operation targets a block that is not a `keyValue`. Returns 400 with no `errors` array. |
| `DOCUMENT_TOO_LARGE` | The resulting document would exceed the document size limit. Returns 422. |

If you write an array where a block belongs, such as runs as the direct child of a `listItem`, the write fails with `VALIDATION_ERROR` at that path. The message is `Expected a block object such as { "kind": "paragraph", "content": [{ "text": "..." }] }, received an array`. Wrap the runs in a paragraph, or pass them to `li`, `ul` or `ol`, which wrap them for you.

### Image URLs

Documents hold references to images, not image data. Upload each image with `assets.uploadImage` (see [assets](#assets)), and write the asset's `url` into the image field. An image field accepts only the `url` of an image asset of the same project.

The image fields are image blocks, image properties, `banner.url`, feature `pinImage`, lane `style.imageUrl`, event `imageUrl` and the `src` of a board image asset. Any other URL in an image field, including an image asset of another project, returns 400 `VALIDATION_ERROR`. A URL that the same document, resource or board already holds in an image field is accepted again. `errors[].path` identifies the field.

On every write to a project, a `data:` or `blob:` URI fails with 400 `VALIDATION_ERROR` in any field named `url`, `src` or `href`, or ending in `Url` or `Src`. `errors[].path` identifies the field, such as `blocks[0].url`, and nothing is written.

Details:

- Board writes refuse the same URIs in image, video and bookmark assets and in a shape `url`. See [boards](#boards).
- Links, link marks, bookmarks and embed blocks are not images. Link marks take `http`, `https`, `mailto` and `lk` URLs; embed blocks take `http` and `https` URLs.

### Maps in pages

A `map` block or property draws a `map` document of the project, identified by `resourceId` and `documentId`. Set both ids, or set neither for an empty block that the app shows as "Link a map".

`viewport` is `{ center: [lat, lng], zoom }` in the map's coordinate frame, which is the frame of a feature's `pos`. Omit `viewport` to center the map on a pin whose link points to the resource holding the map. For example, the pin for a city centers the map on the city's own page.

### Unsupported blocks

A block that the public model cannot express reads as `{ kind: 'unsupported', id }`. It is read-only. To keep its content, echo it by id in `documents.replaceBlocks`, and the server restores the original content in place. If you leave it out, that content is deleted.

To change a document without touching content you cannot read, use the single-block operations instead of `documents.replaceBlocks`.

### Key-value rows

Key-value data lives in three places: a `keyValue` block in a page, a sidebar property of kind `keyValue`, and a `keyValue` property inside an infobox. All three use the same row shape.

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { bold, br, keyValue } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const bmo = await lk.resources.create({ name: 'BMO' })
try {
  const page = bmo.documents[0]!
  const written = await lk.documents.replaceBlocks(
    { resourceId: bmo.id, documentId: page.id },
    { blocks: [keyValue([['Lives in', 'The Tree Fort'], ['Plays', 'Video games']])] },
  )
  const specsId = written.blocks[0]?.id
  if (!specsId) throw new Error('the keyValue block has an id')
  const specs = { resourceId: bmo.id, documentId: page.id, blockId: specsId }

  const rows = await lk.blocks.listRows(specs)
  const plays = rows.data.find((row) => row.key === 'Plays')
  if (!plays?.id) throw new Error('the Plays row has no id')

  const friend = await lk.blocks.createRow(specs, {
    key: 'Best friend',
    content: [...bold('Football'), br, { text: 'the reflection in the bathroom mirror' }],
    after: plays.id,
  })
  if (!friend.id) throw new Error('the new row has no id')
  console.log(friend.key, JSON.stringify(friend.text))

  await lk.blocks.updateRow({ ...specs, rowId: plays.id }, { text: 'Guardians of Sunshine' })
  await lk.blocks.deleteRow({ ...specs, rowId: friend.id })

  for (const row of (await lk.blocks.listRows(specs)).data) console.log(`${row.key}: ${row.text}`)
} finally {
  await lk.resources.delete({ resourceId: bmo.id })
}
```

Each row has `id`, `rank`, `key`, `content` (runs) and `text`, the plain text of `content`. Rows are ordered by `rank`.

| Container | List | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| `keyValue` block | `blocks.listRows` | `blocks.createRow` | `blocks.updateRow` | `blocks.deleteRow` |
| Sidebar property | `properties.listRows` | `properties.createRow` | `properties.updateRow` | `properties.deleteRow` |
| Infobox property | `blocks.listPropertyRows` | `blocks.createPropertyRow` | `blocks.updatePropertyRow` | `blocks.deletePropertyRow` |

To create a row, pass `key` and a value, either as `content` runs or as a plain `text` string. To place the row, pass `before` or `after` with another row's id. With neither, the row is appended. To update a row, pass any of `key`, `content` and `text`.

Details:

- A stored line break reads back as `\n` in `text`.

### Infoboxes

An infobox is a block whose rows are properties, with the same shape as sidebar properties.

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { infobox, keyValue, p, property, textField } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const jake = await lk.resources.create({ name: 'Jake the Dog' })
try {
  const page = jake.documents[0]!
  const written = await lk.documents.replaceBlocks(
    { resourceId: jake.id, documentId: page.id },
    {
      blocks: [
        infobox(property(keyValue([['Species', 'Magic dog'], ['Age', '28']]), { title: 'Stats' })),
        p('Finn’s brother. Stretches into anything, including a boat, a key and a very large hand.'),
      ],
    },
  )
  const box = written.blocks[0]
  if (box?.kind !== 'infobox') throw new Error('the first block is the infobox')
  const statsId = box.rows[0]?.id
  if (!box.id || !statsId) throw new Error('the infobox and its Stats property have ids')
  const sheet = { resourceId: jake.id, documentId: page.id, blockId: box.id }

  const bio = await lk.blocks.createProperty(sheet, {
    ...property(textField('Got his powers from rolling in a magic mud puddle.'), { title: 'Origin' }),
    before: statsId,
    ifMatch: written.version,
  })
  if (!bio.id) throw new Error('the new property has no id')
  console.log(bio.id, bio.kind, bio.rank)

  await lk.blocks.updateProperty({ ...sheet, propertyId: bio.id }, { title: 'Powers', isTitleHidden: false })
  console.log((await lk.blocks.getProperty({ ...sheet, propertyId: bio.id })).title)

  const stats = { ...sheet, propertyId: statsId }
  const plays = await lk.blocks.createPropertyRow(stats, { key: 'Plays', text: 'viola' })
  if (!plays.id) throw new Error('the new row has no id')
  await lk.blocks.updatePropertyRow({ ...stats, rowId: plays.id }, { text: 'viola, badly, for Lady Rainicorn' })
  for (const row of (await lk.blocks.listPropertyRows(stats)).data) console.log(`${row.key}: ${row.text}`)
  await lk.blocks.deletePropertyRow({ ...stats, rowId: plays.id })

  await lk.blocks.deleteProperty({ ...sheet, propertyId: bio.id })
  for (const item of (await lk.blocks.listProperties(sheet)).data) console.log(item.id, item.kind, item.title)
} finally {
  await lk.resources.delete({ resourceId: jake.id })
}
```

Address an infobox's rows by the infobox's `blockId` with `blocks.listProperties`, `blocks.createProperty`, `blocks.getProperty`, `blocks.updateProperty` and `blocks.deleteProperty`. These take the same bodies as the sidebar's `properties.*` operations and return the document `version`.

Any property-capable kind can be an infobox row. For example, a city's infobox can hold `property(map({ resourceId: atlas.id, documentId: atlasMap.id }), { title: 'Location' })`. Without a `viewport`, the map opens centered on the city's pin (see [Maps in pages](#maps-in-pages)).

### Collection filters

`collection({ filter })` selects resources with a filter predicate, the one the app's collection source picker writes, instead of a fixed `items` list. The app evaluates the predicate each time it draws the collection, so the collection follows later changes to the project. The API only stores and returns it.

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { collection, h, p } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const kingdom = await lk.resources.create({ name: 'Candy Kingdom', tags: ['Location', 'Candy Kingdom'] })
const residents = []
for (const resident of [
  { name: 'Princess Bubblegum', tags: ['NPC', 'Candy Kingdom', 'Ally'] },
  { name: 'Peppermint Butler', tags: ['NPC', 'Candy Kingdom', 'Ally'] },
  { name: 'Earl of Lemongrab', tags: ['NPC', 'Candy Kingdom', 'Villain'] },
]) {
  residents.push(await lk.resources.create({ ...resident, parentId: kingdom.id }))
}
try {
  const written = await lk.documents.replaceBlocks(
    { resourceId: kingdom.id, documentId: kingdom.documents[0]!.id },
    {
      blocks: [
        p('The candy-coated capital of Ooo.'),
        h(2, 'Residents'),
        collection({
          filter: { type: 'filter', filterType: 'field', id: 'residents', field: 'parentId', operator: 'equals', value: '$self' },
          isTitleHidden: true,
        }),
        h(2, 'Allies'),
        collection({
          filter: { type: 'filter', filterType: 'tag', id: 'allies', operator: 'has_all', tags: ['NPC', 'Ally'] },
          isTitleHidden: true,
        }),
      ],
    },
  )
  for (const block of written.blocks) {
    if (block.kind === 'resourceCollection') console.log(block.filter?.filterType, block.isTitleHidden)
  }
} finally {
  for (const resident of residents) await lk.resources.delete({ resourceId: resident.id })
  await lk.resources.delete({ resourceId: kingdom.id })
}
```

Every predicate has `type: 'filter'`, an `id` and a `filterType`. The `id` is any string and does not affect matching. Wherever a value is a resource id, `'$self'` stands for the resource whose document holds the collection. The first collection above therefore lists the Candy Kingdom's children wherever the page is copied.

| `filterType` | Fields | Selects |
| --- | --- | --- |
| `field` | `field`, `operator`, `value` | Resources whose `field` compares true against `value`. `field` is `parentId` (the resource's parent id) or `name`. |
| `field` with `scope: 'edges'` | `field: 'targetId'`, `operator: 'equals'`, `value` | Resources whose documents, properties or map pins link to the resource `value`: its backlinks. |
| `tag` | `operator`, `tags` | `has_all`: resources with every tag in `tags`. `has_any`: at least one. `has_none`: none of them. Tags match exactly, including case. `has_all` with an empty `tags` selects nothing. |
| `property` | `propertyType`, `key`, `field`, `operator`, `value` | Resources with a key-value row (`propertyType: 'KEY_VALUE'`, `key` is the row's key) or a meter item (`propertyType: 'METER'`, `key` is the item's name) whose value compares true. `field` is `textValue` or `numValue` for a row, and `meterCurrent` or `meterMax` for a meter item. If omitted, it is `numValue` for a number `value` and `textValue` otherwise. |
| `mention` | `targetId`, `propertyType`, `key` | Resources with a key-value row that mentions the resource `targetId`, narrowed by `propertyType` and `key` when given. |
| `text` | `operator: 'contains'`, `value` | Resources that the app's full-text search matches for `value`. |
| `composite` | `operator`, `filters` | `and`: resources every predicate in `filters` selects. `or`: resources any of them selects. `not`: every resource the single predicate in `filters` does not select. |

`field` and `property` take these operators:

- `equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`.
- `contains` (case-insensitive).
- `starts_with` and `ends_with` (case-sensitive).
- `in` and `not_in`, with an array `value`.
- `regex`, on `property` only.

Details:

- Deleted resources and templates are never listed.
- The schema accepts the filter types `id`, `custom` and `date_range`, but the app does not evaluate them, so a collection that uses one lists no resources.
- A collection whose filter is a `parentId` equality, alone or inside an `and`, lists its resources in tree order. Every other collection lists them by name.

## Namespaces and operations

Every operation is `lk.<namespace>.<method>`. The tables below list the operations of each namespace, and the [API reference](https://www.legendkeeper.com/developers/api/) documents every field. Timestamps such as `createdAt` and `updatedAt` are ISO 8601 strings in UTC ending in `Z`.

### resources

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo', iconGlyph: 'globe', iconColor: '#4caf50' })
try {
  const kingdom = await lk.resources.create({
    name: 'Ice Kingdom',
    parentId: ooo.id,
    tags: ['Kingdom', 'Cold'],
    aliases: ['Land of Ice'],
  })
  console.log(kingdom.id, kingdom.parentId, kingdom.tags, kingdom.documents.length, kingdom.properties.length)

  const renamed = await lk.resources.update({ resourceId: kingdom.id }, { name: 'The Ice Kingdom', tags: ['Kingdom'] })
  console.log(renamed.name, renamed.tags, renamed.aliases)

  const fetched = await lk.resources.get({ resourceId: kingdom.id })
  console.log(fetched.name, fetched.rank)

  for await (const child of await lk.resources.list({ parentId: ooo.id })) console.log('child:', child.name, JSON.stringify(child.aliases))

  await lk.resources.delete({ resourceId: kingdom.id })
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
}
```

A resource is an entry in the project tree, such as a character, a place or a faction. It holds documents and sidebar properties.

A new resource has one `blank` document named `Main`, returned as `documents[0]`. Your first content write gives it a type: blocks make it a page, features or a map image make it a map, board records make it a board, and a lane makes it a timeline. See [documents](#documents) for each write. The examples in this guide write to `documents[0]` and call `documents.create` only for additional documents.

| Operation | Does |
| --- | --- |
| `resources.list` | A page of the project's resources as list items. A list item has `id`, `name`, `parentId`, `tags`, `aliases`, the icon fields, `rank`, `isHidden`, timestamps and `documents`, each document's `id`, `name` and `type`. Pass `parentId` to list the direct children of one resource. Paginated. |
| `resources.createMany` | Creates up to 100 resources in one call and returns them in order. See [Creating many resources](#creating-many-resources). |
| `resources.createFromTemplate` | Creates a resource as a copy of a template and returns it. See [templates](#templates). |
| `resources.saveAsTemplate` | Creates a top-level template as a copy of the resource and returns it. The resource does not change. ADMIN role. See [templates](#templates). |
| `resources.create` | Creates a resource and returns it. `name` is required. See [Stable ids and tree order](#stable-ids-and-tree-order) for `id`, `after` and `before`, and [Documents with content](#documents-with-content) for `documents`. |
| `resources.get` | Returns the resource with its `documents` and sidebar `properties`. |
| `resources.update` | Changes only the fields you send: any of `name`, `tags`, `aliases`, `iconGlyph`, `iconColor`, `iconShape`, `iconSize`, `isHidden`, `isLocked`, `banner` and `permissions`. |
| `resources.move` | Moves the resource and its children to another parent, another position among its siblings, or both. Returns the resource. |
| `resources.delete` | Deletes the resource with its documents and properties. Set `cascade` to `true` to delete its child resources with it. |
| `resources.restore` | Restores a deleted resource and the descendants deleted with it. Returns the resource. |

`iconGlyph` is a Font Awesome icon name, such as `crown` or `dog`. `iconColor` is `#RRGGBB`. `iconShape` and `iconSize` set the shape drawn behind the glyph when the resource appears as a pin on a map.

`aliases` are alternative names that search matches. On update, `tags` and `aliases` replace the whole list.

#### Creating many resources

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const newId = () => `r${crypto.randomUUID().replaceAll('-', '').slice(0, 23)}`
const ooo = newId()

const { resources } = await lk.resources.createMany({
  resources: [
    { id: ooo, name: 'The Land of Ooo', tags: ['World'] },
    { id: newId(), name: 'Candy Kingdom', parentId: ooo, tags: ['Kingdom'] },
    { id: newId(), name: 'Ice Kingdom', parentId: ooo, tags: ['Kingdom'] },
    {
      id: newId(),
      name: 'Fire Kingdom',
      parentId: ooo,
      tags: ['Kingdom'],
      documents: [{ blocks: [{ kind: 'paragraph', content: [{ text: 'Ruled by Flame Princess.' }] }] }],
    },
  ],
})
try {
  for (const resource of resources) console.log(resource.name, resource.parentId === ooo ? 'in Ooo' : 'at the root')
} finally {
  await lk.resources.delete({ resourceId: ooo }, { cascade: true })
}
```

`resources.createMany` takes `resources`, 1 to 100 items, each the same object `resources.create` takes. The server checks every item before it creates any. If an item fails, the call throws that item's error, every `errors[].path` starts with `resources[i]`, and nothing is created. The response lists the created resources in the order you sent them.

An item can name an earlier item of the same call as its `parentId` when that earlier item has an `id`. Such an item is placed after its earlier siblings in the call; it cannot use `after` or `before`. With these, one call builds a whole subtree.

Give every item an `id`. If the call fails with a server error part-way, the items created before the failure remain, and a retry returns 409 `DUPLICATE_ID` for those instead of creating them twice. See [Stable ids and tree order](#stable-ids-and-tree-order).

Details:

- A call counts as one write request against the [rate limits](#rate-limits-and-retries). Its items also count against a budget of 600 items a minute and 6,000 an hour; a call past the budget returns 429 `RATE_LIMITED`.
- An `id` used twice in one call, or already used in the project, returns 409 `DUPLICATE_ID`.

#### Deleting and restoring

```ts
import { ConflictError, LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
const candy = await lk.resources.create({ name: 'Candy Kingdom', parentId: ooo.id })
await lk.resources.create({ name: 'Candy Castle', parentId: candy.id })

try {
  await lk.resources.delete({ resourceId: ooo.id })
} catch (error) {
  if (!(error instanceof ConflictError) || error.code !== 'HAS_CHILDREN') throw error
  console.log(`${error.code}: ${error.message}`)
}

await lk.resources.delete({ resourceId: ooo.id }, { cascade: true })

const restored = await lk.resources.restore({ resourceId: ooo.id })
const { data: children } = await lk.resources.list({ parentId: ooo.id })
console.log(restored.name, children.map((child) => child.name).join(', '))

await lk.resources.delete({ resourceId: ooo.id }, { cascade: true })
```

`resources.delete` fails with 409 `HAS_CHILDREN`, thrown as `ConflictError`, when the resource has child resources that are not deleted. Pass `{ cascade: true }` to delete the resource and all its descendants together.

`resources.restore` restores the resource and every descendant that the same delete removed. Restoring needs the admin role. The API does not list deleted resources, so keep the id of any resource you may want to restore.

Details:

- A key that acts as a member needs Can Edit or Full Access on the resource and on every descendant of a cascade, or the delete fails with 403 `FORBIDDEN` and deletes nothing.

#### Documents with content

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { bold, h, p, plainText, ul } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const kingdom = await lk.resources.create({
  name: 'Candy Kingdom',
  documents: [
    {
      name: 'Overview',
      blocks: [
        h(1, 'Candy Kingdom'),
        p('Ruled by ', bold('Princess Bubblegum'), '.'),
        ul('Candy Castle', 'Candy Village'),
      ],
    },
    { name: 'Map', type: 'map' },
  ],
})
try {
  const [overview, map] = kingdom.documents
  console.log(overview!.name, overview!.type, map!.name, map!.type)
  console.log(plainText(await lk.documents.getBlocks({ resourceId: kingdom.id, documentId: overview!.id })))
} finally {
  await lk.resources.delete({ resourceId: kingdom.id })
}
```

Pass `documents` to `resources.create` to create the resource with up to 5 documents, in order. Each sets `type`, `name`, `blocks` (page only) and `calendarId` (timeline only). `blocks` is validated as `documents.replaceBlocks` validates it. The response has no blocks. Read them with `documents.getBlocks`.

Details:

- One call creates the resource and its content, and counts as one write against the rate limits.

#### Stable ids and tree order

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const newId = () => `r${crypto.randomUUID().replaceAll('-', '').slice(0, 23)}`
const ids = { ooo: newId(), candy: newId(), ice: newId(), fire: newId() }

async function kingdomsInOrder(parentId: string): Promise<string> {
  const { data } = await lk.resources.list({ parentId })
  return data
    .sort((a, b) => ((a.rank ?? '') < (b.rank ?? '') ? -1 : 1))
    .map((kingdom) => kingdom.name)
    .join(', ')
}

const ooo = await lk.resources.create({ id: ids.ooo, name: 'The Land of Ooo' })
const created: string[] = []
try {
  created.push((await lk.resources.create({ id: ids.candy, name: 'Candy Kingdom', parentId: ooo.id })).id)
  created.push((await lk.resources.create({ id: ids.fire, name: 'Fire Kingdom', parentId: ooo.id })).id)
  created.push((await lk.resources.create({ id: ids.ice, name: 'Ice Kingdom', parentId: ooo.id, before: ids.fire })).id)
  console.log(await kingdomsInOrder(ooo.id))

  await lk.resources.move({ resourceId: ids.fire }, { after: ids.candy })
  console.log(await kingdomsInOrder(ooo.id))

  const ice = await lk.resources.move({ resourceId: ids.ice }, { parentId: null })
  console.log(ice.name, ice.parentId ?? 'at the root')

  const candy = await lk.resources.get({ resourceId: ids.candy })
  console.log(candy.id === ids.candy, candy.name)
} finally {
  for (const id of created) await lk.resources.delete({ resourceId: id })
  await lk.resources.delete({ resourceId: ooo.id })
}
```

To sync from another system, pass your own `id` to `resources.create`. Generate an id once per source record and store it with the record. On the next run, read the resource with `resources.get` instead of matching by name. The id must be a cuid2 id of 8 or 24 characters. The example generates its ids with `crypto.randomUUID()`.

A new resource goes after its last sibling. To place it next to a sibling, pass that sibling's id as `after` or `before`.

`resources.move` takes the resource id, then any of `parentId` (a resource id, or `null` for the root), `after` and `before`.

`rank` orders siblings. To show the app's order, sort siblings by `rank` as plain strings, not with a locale comparison, as `kingdomsInOrder` does.

Details:

- An id already used by a resource of the project, including a deleted one, fails with 409 `DUPLICATE_ID`, thrown as `ConflictError`.

### templates

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const kingdom = await lk.resources.create({
  name: 'Kingdom',
  tags: ['Kingdom'],
  documents: [{ blocks: [{ kind: 'paragraph', content: [{ text: 'Ruler, capital, allies.' }] }] }],
})
try {
  await lk.resources.create({ name: 'Castle', parentId: kingdom.id })

  const template = await lk.resources.saveAsTemplate({ resourceId: kingdom.id }, { name: 'Kingdom Template', includeChildren: true })
  try {
    for await (const listed of await lk.templates.list()) console.log('template:', listed.name)

    const realm = await lk.resources.createFromTemplate({ templateId: template.id, name: 'Realm', includeChildren: true })
    try {
      const page = await lk.documents.getBlocks({ resourceId: realm.id, documentId: realm.documents[0]!.id })
      console.log(realm.name, realm.tags, page.text)
      for await (const child of await lk.resources.list({ parentId: realm.id })) console.log('child:', child.name)
    } finally {
      await lk.resources.delete({ resourceId: realm.id }, { cascade: true })
    }
  } finally {
    await lk.resources.delete({ resourceId: template.id }, { cascade: true })
  }
} finally {
  await lk.resources.delete({ resourceId: kingdom.id }, { cascade: true })
}
```

A template is a resource under the virtual root `templates`. `templates` is a reserved id: no resource has it, and `resources.get` does not return it. A top-level template has `parentId` `templates`. A resource under a template is a template too, and its `parentId` is that template's id.

| Operation | Does |
| --- | --- |
| `templates.list` | A page of the project's templates as list items, at any depth. A top-level template has `parentId` `templates`; a nested one has its parent template's id. Paginated. |

Two `resources` operations copy to and from templates:

- `resources.saveAsTemplate` copies a resource into a new top-level template. `name` defaults to the resource's name. `includeChildren: true` also copies its descendants, keeping their tree. `after`, `before` and `id` work as in `resources.create`. The resource does not change.
- `resources.createFromTemplate` copies a template into a new resource. `templateId` names a template at any depth; a resource that is not a template returns 400 `VALIDATION_ERROR`. `name` defaults to the template's name without the word `Template`. `parentId`, `after`, `before`, `id` and `includeChildren` work as above.

A copy has the source's fields, sidebar properties and documents with their content, under new ids. A copy holds at most 100 resources, and each copied resource counts against the item budget of `resources.createMany`. Mentions in the copied content keep pointing at the resources they named in the source.

Templates are read, updated, moved and deleted with the `resources` operations, which also take the `templates` id:

- `resources.create` with `parentId: 'templates'` creates a top-level template.
- `resources.move` with `parentId: 'templates'` makes a resource a top-level template. `parentId: null` moves it back to the root.
- `resources.list` with `parentId: 'templates'` lists the top-level templates. Without `parentId`, it lists templates with the other resources.

Only a project admin can create a resource under `templates`, move one there, or call `resources.saveAsTemplate`. Search and collection blocks do not return templates.

### documents

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { p } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const fort = await lk.resources.create({ name: 'The Tree Fort' })
try {
  const first = fort.documents[0]
  if (!first) throw new Error('a new resource has one document')
  const overview = { resourceId: fort.id, documentId: first.id }
  console.log(first.name, first.type)

  await lk.documents.replaceBlocks(overview, { blocks: [p('A giant tree full of treasure.')] })
  const content = await lk.documents.getBlocks(overview)
  console.log(content.schema, content.version, JSON.stringify(content.text))

  await lk.documents.update(overview, { name: 'About the Tree Fort', isFullWidth: true })
  const about = await lk.documents.get(overview)
  console.log(about.name, about.type, about.isFullWidth, about.rank)

  const stash = await lk.documents.create({ resourceId: fort.id }, { name: 'Jake’s secret stash', type: 'page', isHidden: true })
  const floorPlan = await lk.documents.create({ resourceId: fort.id }, { name: 'Floor plan', type: 'map' })

  const listed = await lk.documents.list({ resourceId: fort.id })
  console.log(listed.data.map((doc) => `${doc.name} (${doc.type})`).join(', '), 'hides', stash.name)

  await lk.documents.delete({ resourceId: fort.id, documentId: floorPlan.id })
} finally {
  await lk.resources.delete({ resourceId: fort.id })
}
```

A document is one tab of a resource. Its `type` sets what it holds: `page` holds blocks, `map` holds features, `time` holds a timeline and `board` holds a drawing canvas. A `blank` document holds nothing yet.

A new resource's first document is `blank`. Write content to it, and call `documents.create` only for additional documents, as the example does.

Your first typed write to a `blank` document converts it in the same request that saves the content:

| Write | Converts it to |
| --- | --- |
| `documents.replaceBlocks`, `blocks.insert` | `page` |
| `boards.createShapes`, `boards.replaceContent` | `board` |
| `features.create`, `documents.update` with `mapImage` | `map` |
| `timelines.createLane` | `time`, with `calendarId` `gregorian` |

Once converted, the document's `type` never changes back.

| Operation | Does |
| --- | --- |
| `documents.list` | Every document of the resource as a summary. Hidden documents are listed only to the ADMIN and OWNER roles. Order by `rank` to match the app. |
| `documents.create` | Creates a document after the existing ones. `name` and `type` (`page`, `board`, `map`, `time` or `blank`) are required; `isHidden` and `isFullWidth` default to false; a `time` document may take `calendarId`. It starts empty. |
| `documents.get` | The document summary: `id`, `name`, `type`, `rank`, `isHidden`, `isFullWidth`, timestamps, `calendarId` and `sources` for a timeline, and `mapImage` for a map. |
| `documents.update` | Changes any of `name`, `rank`, `isHidden`, `isFullWidth`, `calendarId` and `sources` on a `time` document (see [Chaining timelines](#chaining-timelines)), and `mapImage` on a map document (see [Map images](#map-images)). Content is not touched. |
| `documents.delete` | Deletes the document. Its content is kept in the project's trash until `documents.restore` brings it back or the trash is emptied. |
| `documents.restore` | Brings a deleted document back in its old place, with its content. A document that is not deleted answers 409 `NOT_DELETED`; one whose resource is deleted answers 409 `PARENT_DELETED` (restore the resource instead). Needs the same access as deleting it. |
| `documents.getBlocks` | The page content as blocks, with `text` and `version`. See [Writing content](#writing-content). |
| `documents.replaceBlocks` | Replaces the page content. Takes `ifMatch`. |
| `documents.assignBlockIds` | Gives an id to every block that has none. See [Block operations](#block-operations). |

Read and write board content with [boards](#boards).

Details:

- Reads never convert a `blank` document: `documents.getBlocks` returns an empty page, `boards.getContent` and `boards.listShapes` return an empty board, and `features.list`, `timelines.listLanes` and `timelines.listEvents` return empty lists.

### properties

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { keyValue, property, textField } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const marceline = await lk.resources.create({ name: 'Marceline the Vampire Queen' })
try {
  const sidebar = { resourceId: marceline.id }

  const stats = await lk.properties.create(sidebar, property(keyValue([['Age', 'Over a thousand']]), { title: 'Stats' }))
  const bio = await lk.properties.create(sidebar, {
    ...property(textField('Eats the color red. Plays an axe bass that used to be her family’s heirloom axe.'), { title: 'Bio' }),
    before: stats.id,
  })
  if (!stats.id || !bio.id) throw new Error('a new property has no id')

  await lk.properties.update({ ...sidebar, propertyId: bio.id }, { title: 'Lore', isHidden: true })
  const lore = await lk.properties.get({ ...sidebar, propertyId: bio.id })
  console.log(lore.title, lore.isHidden)

  const rows = { ...sidebar, propertyId: stats.id }
  const dad = await lk.properties.createRow(rows, { key: 'Dad', text: 'Hunson Abadeer' })
  if (!dad.id) throw new Error('the new row has no id')
  await lk.properties.updateRow({ ...rows, rowId: dad.id }, { key: 'Father' })
  for (const row of (await lk.properties.listRows(rows)).data) console.log(`${row.key}: ${row.text}`)
  await lk.properties.deleteRow({ ...rows, rowId: dad.id })

  await lk.properties.delete({ ...sidebar, propertyId: bio.id })
  for (const item of (await lk.properties.list(sidebar)).data) console.log(item.kind, item.title, item.rank)
} finally {
  await lk.resources.delete({ resourceId: marceline.id })
}
```

Sidebar properties are the fields beside a resource's pages. Each is a PropertyBlock: a property-capable block plus the envelope fields `id`, `rank`, `title`, `isTitleHidden` and `isHidden`. The property-capable blocks are `textField`, `keyValue`, `image`, `meter`, `resourceCollection`, `resourceLink`, `embed` and `map`. Build a property with `property(block, envelope)`.

| Operation | Does |
| --- | --- |
| `properties.list` | Returns the sidebar properties, sorted by rank. |
| `properties.create` | Adds a property. To place it, pass another property's id as `before` or `after`. Pass neither to append it. |
| `properties.get` | Returns one property. |
| `properties.update` | Merges the fields you send into the property: envelope fields and the fields of its kind. Patching `rank` moves it. |
| `properties.delete` | Removes the property and its rows. |
| `properties.listRows` | Returns the rows of a `keyValue` property. |
| `properties.createRow` | Adds a row. Takes `ifMatch`. |
| `properties.updateRow` | Changes a row. Takes `ifMatch`. |
| `properties.deleteRow` | Removes a row. Takes `ifMatch`. |

### blocks

Use `blocks` to work with single blocks in a page, the rows of a `keyValue` block, and the properties and rows of an infobox. Every write takes `ifMatch` and returns the document `version`. For examples, see [Writing content](#writing-content).

| Operation | Does |
| --- | --- |
| `blocks.insert` | Inserts a block. |
| `blocks.get` | Reads a block and its subtree. |
| `blocks.update` | Changes a block's own fields. |
| `blocks.replace` | Replaces a block and its subtree. |
| `blocks.move` | Moves a block and its subtree. |
| `blocks.delete` | Deletes a block and its subtree. |
| `blocks.listRows` | Returns the rows of a `keyValue` block. |
| `blocks.createRow` | Adds a row to a `keyValue` block. |
| `blocks.updateRow` | Changes a row of a `keyValue` block. |
| `blocks.deleteRow` | Removes a row from a `keyValue` block. |
| `blocks.listProperties` | Returns the properties of an infobox. |
| `blocks.createProperty` | Adds a property to an infobox. |
| `blocks.getProperty` | Returns one property of an infobox. |
| `blocks.updateProperty` | Changes a property of an infobox. |
| `blocks.deleteProperty` | Removes a property from an infobox. |
| `blocks.listPropertyRows` | Returns the rows of a `keyValue` property in an infobox. |
| `blocks.createPropertyRow` | Adds a row to a `keyValue` property in an infobox. |
| `blocks.updatePropertyRow` | Changes a row of a `keyValue` property in an infobox. |
| `blocks.deletePropertyRow` | Removes a row from a `keyValue` property in an infobox. |

### boards

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
try {
  const board = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }

  const empty = await lk.boards.getContent(board)
  console.log(empty.pages.map((page) => page.name).join(', '), empty.shapes.length, 'shapes')

  const created = await lk.boards.createShapes(board, {
    ifMatch: empty.version,
    shapes: [
      { id: 'shape:candy-kingdom', type: 'geo', x: 0, y: 0, props: { w: 220, h: 120, text: 'Candy Kingdom', color: 'violet', fill: 'solid' } },
      { id: 'shape:ice-kingdom', type: 'geo', x: 480, y: 0, props: { w: 220, h: 120, text: 'Ice Kingdom', color: 'light-blue', fill: 'solid' } },
      { id: 'shape:rivalry', type: 'arrow', props: { text: 'kidnaps princesses from' } },
      { type: 'note', x: 0, y: 220, props: { text: 'Gunter was last seen here' } },
    ],
    bindings: [
      { type: 'arrow', fromId: 'shape:rivalry', toId: 'shape:ice-kingdom', props: { terminal: 'start' } },
      { type: 'arrow', fromId: 'shape:rivalry', toId: 'shape:candy-kingdom', props: { terminal: 'end' } },
    ],
  })
  console.log(created.shapes.length, 'shapes and', created.bindings.length, 'bindings')

  const updated = await lk.boards.updateShapes(board, { ifMatch: created.version, shapes: [{ id: 'shape:ice-kingdom', y: 60, props: { color: 'blue' } }] })

  const deleted = await lk.boards.deleteShapes(board, { ids: ['shape:rivalry'], ifMatch: updated.version })
  console.log('deleted', deleted.shapeIds.join(', '), 'and', deleted.bindingIds.length, 'bindings')

  const shapes = await lk.boards.listShapes(board)
  console.log(shapes.data.map((shape) => `${shape.type} at ${shape.x},${shape.y}`).join('\n'))

  const replaced = await lk.boards.replaceContent(board, {
    ifMatch: deleted.version,
    shapes: [{ type: 'text', x: 0, y: 0, props: { text: 'The Land of Ooo' } }],
  })
  console.log(replaced.shapes.length, 'shape after the replace')
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
}
```

A board is a document of type `board`. It holds tldraw 3.9 records: pages, shapes, bindings and assets. `boards.getContent` returns them as tldraw stores them, so tldraw's `TLShape`, `TLBinding` and `TLAsset` types describe them. The response also includes `schema`, the tldraw schema that writes are validated against, and the board `version`.

| Operation | Does |
| --- | --- |
| `boards.getContent` | Returns every page, shape, binding and asset record of the board, with `schema` and `version`. |
| `boards.listShapes` | Returns every shape ordered by `index`. Pass `pageId` to get only the shapes on one page. Not paginated. |
| `boards.createShapes` | Creates `shapes` and the optional `bindings` and `assets`, up to 500 of each. |
| `boards.updateShapes` | Changes up to 500 shapes, each identified by its `id`. |
| `boards.deleteShapes` | Deletes the shapes listed in `ids`, up to 500. |
| `boards.replaceContent` | Deletes every shape, binding and asset and stores the ones sent. Pages are kept. |

Every write takes `ifMatch`, returns the new `version`, and is atomic: when any record fails, nothing is stored.

A new shape needs only `type`. `x`, `y`, `rotation`, `index`, `parentId` and every prop it omits take the app's defaults. An arrow attaches to shapes through two bindings, one per terminal, as the example shows.

Image, video and bookmark assets reference their files by URL. See [Image URLs](#image-urls).

### timelines and calendars

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const calendars = await lk.calendars.list()
console.log(calendars.data.map((calendar) => calendar.name ?? calendar.id).join(', '))

const brothers = await lk.resources.create({ name: 'Finn and Jake' })
try {
  const timeline = { resourceId: brothers.id, documentId: brothers.documents[0]!.id }

  const finn = await lk.timelines.createLane(timeline, { name: 'Finn', rank: 'a0', size: 'lg' })
  const jake = await lk.timelines.createLane(timeline, { name: 'Jake', rank: 'a1', size: 'sm', style: { color: '#f4a300' } })
  await lk.timelines.updateLane({ ...timeline, laneId: jake.id }, { name: 'Jake the Dog' })
  console.log((await lk.timelines.getLane({ ...timeline, laneId: jake.id })).name)

  const year = 60 * 24 * 365
  const mud = await lk.timelines.createEvent(timeline, { laneId: jake.id, type: 'event', name: 'Rolls in the magic mud puddle', start: 1000 * year })
  const found = await lk.timelines.createEvent(timeline, { laneId: jake.id, type: 'event', name: 'Jake’s family finds baby Finn', start: 1016 * year })
  const heroes = await lk.timelines.createEvent(timeline, {
    laneId: finn.id,
    type: 'event',
    name: 'Adventuring out of the Tree Fort',
    start: 1028 * year,
    end: 1033 * year,
  })
  console.log(mud.formattedStart, heroes.formattedStart, heroes.formattedEnd)
  console.log(heroes.startDate.year, heroes.startDate.era.abbr, heroes.startDate.iso, heroes.endDate?.iso)

  await lk.timelines.updateEvent({ ...timeline, eventId: found.id }, { laneId: finn.id, name: 'Found in the woods by the Dogs' })
  const moved = await lk.timelines.getEvent({ ...timeline, eventId: found.id })
  console.log(moved.name, moved.laneId === finn.id)

  for await (const event of await lk.timelines.listEvents(timeline, { limit: 50 })) console.log(event.start, event.name)
  for (const lane of (await lk.timelines.listLanes(timeline)).data) console.log(lane.rank, lane.name, lane.size)

  await lk.timelines.deleteEvent({ ...timeline, eventId: mud.id })
  await lk.timelines.deleteLane({ ...timeline, laneId: jake.id })
} finally {
  await lk.resources.delete({ resourceId: brothers.id })
}
```

A timeline is a document of type `time`. It holds lanes, and each event sits on one lane. Create a lane before any event: the first lane converts a `blank` document to a timeline.

| Operation | Does |
| --- | --- |
| `calendars.list` | The project's custom calendars, then the built-in ones, each with its `version`. Not paginated. |
| `calendars.create` | Creates a custom calendar from a calendar spec and returns it with its `id` and `version`. |
| `calendars.update` | Replaces a custom calendar with a new spec. Takes `ifMatch`. |
| `calendars.delete` | Deletes a custom calendar. Takes `ifMatch`. |
| `timelines.listLanes` | Every lane, including lanes of chained timelines. Order by `rank`. |
| `timelines.createLane` | Creates a lane. `name`, `rank` and `size` (`sm` or `lg`) are required. Converts a `blank` document to a timeline. |
| `timelines.getLane` | One lane of this document. |
| `timelines.updateLane` | Changes any of `name`, `rank`, `size` and `style`. |
| `timelines.deleteLane` | Deletes the lane and every event on it. |
| `timelines.listEvents` | A page of events ordered by `start`, including events of chained timelines. |
| `timelines.createEvent` | Creates an event. `laneId`, `type` (`event` or `note`) and a start are required. |
| `timelines.getEvent` | One event. |
| `timelines.updateEvent` | Changes the fields sent. `laneId` moves the event to another lane. |
| `timelines.deleteEvent` | Deletes the event. |

An event's `start` and `end` are minutes on the calendar's timeline. The example approximates a year as `60 * 24 * 365` minutes, so its dates drift by a day every few years.

Instead of `start`, you can send `formattedStart`, a date written in the document's calendar, such as `1000`, `June 2012` or `March 3rd, 2012`. The server parses it into `start` and `detail`, the precision of the date (1 for a year, 2 for a month, 3 for a day, 4 for a time). `formattedEnd` does the same for `end`. The [worked example](#worked-example) writes its dates this way.

Reads include `formattedStart` and `formattedEnd` rendered in the document's calendar. They also include `startDate` and, when the event has an end, `endDate`: the date as `{ year, month, monthName, day, hour, minute, era }`, where `era` is `{ id, name, abbr }`. On the Gregorian calendar, the date also has `iso`.

The document's calendar decides what a date means. Set it with `calendarId` on `documents.create` or `documents.update`; `documents.get` returns it. Changing it moves no event: every event keeps its time and renders in the new calendar.

`rank` on lanes is a fractional index string, such as `a0`, `a1` and `a2`. Lanes sort by comparing ranks as strings. To place a lane between two others, give it a rank that sorts between theirs, such as `a0V` between `a0` and `a1`.

An event's `uri` links it to a resource or document, with the same rules as a feature's `uri` (see [features](#features)). `imageUrl` on an event and `style.imageUrl` on a lane take the `url` of an image asset of the project (see [Image URLs](#image-urls)).

#### Chaining timelines

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
const candy = await lk.resources.create({ name: 'The Candy Kingdom' })
try {
  const history = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }
  const kingdom = { resourceId: candy.id, documentId: candy.documents[0]!.id }

  await lk.timelines.createLane(history, { name: 'The Land of Ooo', rank: 'a0', size: 'lg' })
  await lk.timelines.createLane(kingdom, { name: 'The Candy Kingdom', rank: 'a1', size: 'sm' })

  const chained = await lk.documents.update(history, { sources: [kingdom] })
  console.log(chained.sources)
  for (const lane of (await lk.timelines.listLanes(history)).data) console.log(lane.rank, lane.name)

  await lk.documents.update(history, { sources: [] })
  console.log((await lk.timelines.listLanes(history)).data.length)
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
  await lk.resources.delete({ resourceId: candy.id })
}
```

A timeline can chain other timelines as its `sources`. `timelines.listLanes` and `timelines.listEvents` on the chaining timeline include the lanes and events of each source, and of the sources' own sources in turn. `timelines.getLane` and `timelines.getEvent` read only the timeline's own lanes and events.

To chain timelines, pass `sources` to `documents.update` on a `time` document. It replaces the list, and `[]` removes every source. `documents.get`, `documents.list`, `documents.create` and `documents.update` return `sources` on a `time` document as an ordered list of `{ resourceId, documentId }`.

Details:

- A source the caller cannot read is left out of the lanes and events, as well as out of `sources`.

#### Calendars

```ts
import { LegendKeeper, ValidationError, VersionMismatchError, type components } from '@legendkeeper/sdk'

type CalendarSpec = components['schemas']['CalendarSpec']

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const month = (id: string, name: string, length: number) => ({ id, name, isIntercalary: false, length, interval: 1, offset: 0 })

const spec: CalendarSpec = {
  name: 'The Calendar of Ooo',
  description: 'Four kingdom months of thirty days and the five-day Mathematical festival, counted from the Great Mushroom War.',
  hasZeroYear: false,
  maxMinutes: 1_800_000_000,
  months: [
    month('candy', 'Candy', 30),
    month('ice', 'Ice', 30),
    month('flame', 'Flame', 30),
    month('lumpy-space', 'Lumpy Space', 30),
    { ...month('mathematical', 'Mathematical', 5), isIntercalary: true },
  ],
  leapDays: [
    { id: 'gunter-day', name: 'Gunter Day', intercalary: false, month: 3, addsWeekDay: false, day: 1, weekDay: '', interval: '4', offset: 0 },
  ],
  weekdays: [
    { id: 'finn', name: 'Finnsday' },
    { id: 'jake', name: 'Jakesday' },
    { id: 'bubblegum', name: 'Bubblegumsday' },
    { id: 'marceline', name: 'Marcelinesday' },
    { id: 'bmo', name: 'BMOsday' },
  ],
  epochWeekday: 0,
  weekResetsEachMonth: false,
  hoursInDay: 24,
  minutesInHour: 60,
  negativeEra: { id: 'before-war', name: 'Before the Mushroom War', abbr: 'BMW', hideAbbr: false, startsAt: -180_000_000, resetMode: 'none' },
  positiveEras: [{ id: 'after-war', name: 'After the Mushroom War', abbr: 'AMW', hideAbbr: false, startsAt: 0, resetMode: 'none' }],
  moons: [{ id: 'the-moon', name: 'The Moon', phase: 40_320, shift: 0, color: '#E8E4D8' }],
  format: { id: 'ooo', year: 'YYYY E', month: 'MMMM YYYY E', day: 'MMMM D^, YYYY E', time: 'MMMM D^, YYYY E, HH:mm' },
  halfClock: false,
}

const calendar = await lk.calendars.create(spec)
let version = calendar.version
const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
try {
  const timeline = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }

  const lane = await lk.timelines.createLane(timeline, { name: 'Kingdoms', rank: 'a0', size: 'lg' })
  await lk.documents.update(timeline, { calendarId: calendar.id })
  console.log((await lk.documents.get(timeline)).calendarId === calendar.id)
  await lk.timelines.createEvent(timeline, { laneId: lane.id, type: 'event', name: 'Princess Bubblegum makes the first Candy Person', formattedStart: '200 AMW' })
  await lk.timelines.createEvent(timeline, { laneId: lane.id, type: 'event', name: 'Finn is found in the woods', formattedStart: 'Flame 14th, 1016 AMW' })
  for await (const event of await lk.timelines.listEvents(timeline)) {
    const { day, monthName, year, era } = event.startDate
    console.log(event.formattedStart, event.name, '|', day, monthName, year, era.abbr)
  }

  const renamed = await lk.calendars.update({ calendarId: calendar.id }, { ...spec, name: 'The Ooo Reckoning', ifMatch: version })
  version = renamed.version
  try {
    await lk.calendars.update({ calendarId: calendar.id }, { ...spec, ifMatch: calendar.version })
  } catch (error) {
    if (!(error instanceof VersionMismatchError)) throw error
    console.log(`stale version refused: ${error.code}`)
  }

  try {
    await lk.calendars.update({ calendarId: 'gregorian' }, spec)
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    console.log(`built-in calendars cannot change: ${error.code}`)
  }

  await lk.documents.update(timeline, { calendarId: 'harptos' })
  for await (const event of await lk.timelines.listEvents(timeline)) console.log(event.formattedStart, event.name)
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
  await lk.calendars.delete({ calendarId: calendar.id }, { ifMatch: version })
}
```

The example creates the Calendar of Ooo, sets it as the timeline's `calendarId`, and writes two events whose `formattedStart` follows that calendar's `format`. Moving the timeline to `harptos` renders the same two events as Harptos dates.

A calendar spec defines the months, leap days, weekdays, clock, eras, moons and date `format` of a year. The [API reference](https://www.legendkeeper.com/developers/api/) documents each field. Its `CalendarSpec` example is the Calendar of Ooo used here.

`calendars.update` replaces the whole spec. To avoid overwriting another change, pass the calendar `version` from `calendars.list`, `calendars.create` or an earlier update as `ifMatch`. A calendar changed since then fails with 412, thrown as `VersionMismatchError`.

The built-in calendars are `gregorian`, `harptos`, `eberron`, `exandria`, `greyhawk` and `elder-scrolls`. You can't change or delete them. To change one, create a copy with `calendars.create` and point timelines at the copy.

Details:

- A spec must describe a calendar that renders a date, or `calendars.create` fails with 400 `VALIDATION_ERROR`.
- `calendars.update` and `calendars.delete` with an unknown `calendarId` return 404 `NOT_FOUND`.

### features

```ts
import { LegendKeeper, ValidationError } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
const fort = await lk.resources.create({ name: 'The Tree Fort' })
try {
  const map = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }

  const homes = await lk.features.create(map, { type: 'folder', name: 'Homes' })
  const pin = await lk.features.create(map, {
    type: 'pin',
    name: 'The Tree Fort',
    pos: [12.5, -40.25],
    parentId: homes.id,
    uri: `lk://resources/${fort.id}`,
    iconShape: 'none',
  })
  const ice = await lk.features.create(map, {
    type: 'region',
    name: 'Ice Kingdom',
    polygon: [[40, -60], [40, -20], [30, -20], [30, -60]],
    color: '#a8d8ff',
    fillOpacity: 0.3,
  })

  await lk.features.update({ ...map, featureId: pin.id }, { pos: [12.75, -40.5], iconGlyph: 'tree' })
  const moved = await lk.features.get({ ...map, featureId: pin.id })
  console.log(moved.name, moved.pos, moved.parentId === homes.id, moved.uri, moved.iconShape)

  const [fortPage] = fort.documents
  if (!fortPage) throw new Error('a new resource has one document')
  await lk.features.update({ ...map, featureId: ice.id }, { uri: `lk://documents/${fortPage.id}` })
  try {
    await lk.features.update({ ...map, featureId: ice.id }, { uri: 'https://example.com/ice-kingdom' })
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    for (const issue of error.errors ?? []) console.log(`${error.code} at ${issue.path}`)
  }
  console.log((await lk.features.get({ ...map, featureId: ice.id })).uri)
  await lk.features.update({ ...map, featureId: ice.id }, { uri: '' })

  for (const feature of (await lk.features.list(map)).data) console.log(feature.type, feature.name)
  console.log((await lk.features.list(map, { type: 'pin' })).data.length, 'pins')

  await lk.features.delete({ ...map, featureId: ice.id })
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
  await lk.resources.delete({ resourceId: fort.id })
}
```

A map is a document of type `map`. Features are its pins, labels, regions, paths and folders.

A new map has no image. It still stores and returns features, but the app shows "This map is empty" until the map has an image. To set one, see [Map images](#map-images).

| Operation | Does |
| --- | --- |
| `features.list` | Every feature, or only those of one `type`. Not paginated. |
| `features.create` | Creates a feature. Every field is optional. `type` selects the kind and `pos` places it. |
| `features.get` | One feature. |
| `features.update` | Changes the fields sent. |
| `features.delete` | Deletes the feature. Deleting a folder leaves the features in it in place; their `parentId` still names the deleted folder. |

`pos` is `[lat, lng]` in the map's coordinate frame. `parentId` nests a feature in a folder, and `rank` orders it among its siblings.

Each type has its own shape fields:

- Regions take `polygon`, a list of `[lat, lng]` points, or `polygons`, with fill and border styles.
- Paths take `polyline` and stroke styles.
- Pins take `pinImage`, `{ url, width, height }` (see [Image URLs](#image-urls)), and `iconGlyph`, `iconColor`, `iconShape` and `iconSize` with the values of [resources](#resources).

Every color is a hex string `#RRGGBB`. Each color field applies to some feature types only:

| Field | Types | Colors | Absent |
| --- | --- | --- | --- |
| `iconColor` | `pin` | The pin shape. The glyph is drawn black or white for contrast. No effect with `iconShape` `none` or a `pinImage`. A pin synced to a resource through `uri` draws that resource's `iconColor` instead. | `#A7A7A7` |
| `color` | `region`, `path` | A region's fill and border; a path's line. | `#3B82F6` |
| `textColor` | `label`, `region`, `path` | The name text: a label's text, or the name drawn on a region or path. | `#FFFFFF` |
| `textEffect` | `label`, `region`, `path` | How `textEffectColor` is drawn: `outline` around the letters, or `background`, a box behind the text at 50% opacity. | `outline` |
| `textEffectColor` | `label`, `region`, `path` | The outline or the background box. | `#000000` |

Details:

- Reads return colors as stored, so a feature drawn in the app before this API existed may have a color in another CSS form.

`uri` links a feature, or a timeline event, to a resource or a document in the same project. It takes one of three forms:

| Form | Links to |
| --- | --- |
| `lk://resources/<resourceId>` | A resource. |
| `lk://documents/<documentId>` | A document. |
| `lk://resources/<resourceId>/docs/<documentId>` | A document of that resource, in the legacy form. |

An empty string clears the link.

#### Map images

```ts
import { deflateSync } from 'node:zlib'
import { LegendKeeper, pixelToPos, posToPixel } from '@legendkeeper/sdk'

type Rgb = [number, number, number]

const kingdoms: { name: string; pixel: [number, number]; color: Rgb }[] = [
  { name: 'Candy Kingdom', pixel: [520, 420], color: [255, 160, 200] },
  { name: 'Ice Kingdom', pixel: [220, 170], color: [220, 240, 255] },
  { name: 'Fire Kingdom', pixel: [830, 610], color: [255, 110, 40] },
]
const grass: Rgb = [120, 200, 90]
const kingdomAt = (x: number, y: number) => kingdoms.find(({ pixel }) => Math.hypot(x - pixel[0], y - pixel[1]) < 110)

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
const art = await lk.assets.uploadImage({
  data: png(1024, 768, (x, y) => kingdomAt(x, y)?.color ?? grass),
  contentType: 'image/png',
  name: 'Map of Ooo',
})
try {
  const map = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }

  const updated = await lk.documents.update(map, { mapImage: { assetId: art.id } })
  const image = updated.mapImage
  if (!image) throw new Error('the map has an image')
  console.log(image.width, image.height, JSON.stringify(image.bounds), image.assetId === art.id)

  for (const kingdom of kingdoms) {
    const [x, y] = kingdom.pixel
    await lk.features.create(map, { type: 'pin', name: kingdom.name, pos: pixelToPos(image, x, y) })
  }

  for (const pin of (await lk.features.list(map, { type: 'pin' })).data) {
    if (!pin.pos) continue
    console.log(pin.name, JSON.stringify(pin.pos), JSON.stringify(posToPixel(image, pin.pos)))
  }
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
  await lk.assets.delete({ assetId: art.id })
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const chunk = Buffer.alloc(body.length + 8)
  chunk.writeUInt32BE(data.length, 0)
  body.copy(chunk, 4)
  chunk.writeUInt32BE(crc32(body), body.length + 4)
  return chunk
}

function png(width: number, height: number, colorAt: (x: number, y: number) => Rgb): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const stride = width * 3 + 1
  const rows = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) rows.set(colorAt(x, y), y * stride + 1 + x * 3)
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', new Uint8Array())])
}
```

To set or replace a map's image, upload it with `assets.uploadImage` (see [Uploading images](#uploading-images)). Then pass `mapImage: { assetId }` to `documents.update`. The returned document's `mapImage` has `assetId`, `url`, `width`, `height` and `bounds`.

`bounds` is `[[south, west], [north, east]]`, the `[lat, lng]` corners the image covers. To place features by pixel, use `pixelToPos(mapImage, x, y)`, which converts a pixel counted from the image's top-left corner to a `pos`. `posToPixel(mapImage, pos)` converts back. Both are exported from `@legendkeeper/sdk`.

### assets

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const treasure = await lk.assets.createFolder({ name: 'Tree Fort treasure' })
try {
  const scans = await lk.assets.createFolder({ name: 'Enchiridion', folderId: treasure.id })

  await lk.assets.update({ assetId: scans.id }, { name: 'Enchiridion scans', description: 'Pages from the book of heroes, for the players' })
  const renamed = await lk.assets.get({ assetId: scans.id })
  console.log(renamed.name, renamed.type, renamed.folderId === treasure.id, renamed.description)

  for await (const asset of await lk.assets.list({ folderId: treasure.id })) console.log('in the treasure folder:', asset.name)

  await lk.assets.update({ assetId: scans.id }, { folderId: null })
  const root = await lk.assets.list({ limit: 100 })
  console.log(root.data.some((asset) => asset.id === scans.id))
  await lk.assets.delete({ assetId: scans.id })
} finally {
  await lk.assets.delete({ assetId: treasure.id })
}
```

Assets are the project's library of images, maps and folders. Use the API to create folders, upload images and manage existing assets. Any member can upload an image or create a folder. Every other write needs the ADMIN role, including updating or deleting an asset that you uploaded.

| Operation | Does |
| --- | --- |
| `assets.list` | Lists one folder's direct contents, or the root when `folderId` is absent. Items have the same fields as `assets.get`. Paginated. |
| `assets.createFolder` | Creates a folder. `name` is required. `folderId` nests it. Any member. |
| `assets.uploadImage` | Uploads one image and returns the created asset. It calls `assets.createImageUpload`, sends the bytes to storage, and calls `assets.createImage`. |
| `assets.createImageUpload` | Step one of an upload. Returns a signed `uploadUrl`, the `method` and `headers` to send with it, an `uploadKey`, and `expiresAt`. |
| `assets.createImage` | Step two. Registers the file stored under `uploadKey` as an image asset. |
| `assets.get` | Returns one asset: `id`, `name`, `type`, `folderId`, `isHidden`, `description`, `url`, and for an image, `width` and `height`. |
| `assets.update` | Changes any of `name`, `description`, `folderId`, and `isHidden`. Set `folderId` to `null` to move the asset to the root. ADMIN role. |
| `assets.delete` | Deletes the asset. Deleting a folder deletes everything inside it. ADMIN role. |

#### Uploading images

```ts
import { deflateSync } from 'node:zlib'
import { LegendKeeper, ValidationError } from '@legendkeeper/sdk'
import { image } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const album = await lk.assets.createFolder({ name: 'BMO’s photo album' })
const bmo = await lk.resources.create({ name: 'BMO' })
try {
  const face = await lk.assets.uploadImage({ data: solidPng(32, [79, 187, 162]), contentType: 'image/png', name: 'BMO’s face', folderId: album.id })
  console.log(face.type, face.width, face.height, face.url)
  if (face.url === undefined) throw new Error('an uploaded image has a url')

  const gum = solidPng(16, [255, 105, 180])
  const upload = await lk.assets.createImageUpload({ contentType: 'image/png', contentLength: gum.byteLength })
  const stored = await fetch(upload.uploadUrl, { method: upload.method, headers: upload.headers, body: gum })
  if (!stored.ok) throw new Error(`storage answered ${stored.status}`)
  const asset = await lk.assets.createImage({ uploadKey: upload.uploadKey, name: 'A piece of gum', folderId: album.id })
  console.log(asset.name, asset.width, asset.height)

  const page = bmo.documents[0]!
  const doc = { resourceId: bmo.id, documentId: page.id }
  await lk.documents.replaceBlocks(doc, { blocks: [image(face.url, 'BMO’s face')] })
  await lk.resources.update({ resourceId: bmo.id }, { banner: { enabled: true, url: face.url, yPosition: 50 } })

  try {
    await lk.documents.replaceBlocks(doc, { blocks: [image('data:image/png;base64,iVBORw0KGgo=', 'Pasted from the clipboard')] })
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    for (const issue of error.errors ?? []) console.log(`${error.code} at ${issue.path}`)
  }
} finally {
  await lk.resources.delete({ resourceId: bmo.id })
  await lk.assets.delete({ assetId: album.id })
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const chunk = Buffer.alloc(body.length + 8)
  chunk.writeUInt32BE(data.length, 0)
  body.copy(chunk, 4)
  chunk.writeUInt32BE(crc32(body), body.length + 4)
  return chunk
}

function solidPng(size: number, rgb: [number, number, number]): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const row = [0, ...Array.from({ length: size }, () => rgb).flat()]
  const pixels = deflateSync(Buffer.from(Array.from({ length: size }, () => row).flat()))
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('IDAT', pixels), pngChunk('IEND', new Uint8Array())])
}
```

`assets.uploadImage` takes these options:

- `data`: the file's bytes, as a `Uint8Array`, an `ArrayBuffer` or a `Blob`. A Node `Buffer` and a browser `File` both work.
- `contentType`: one of `image/jpeg`, `image/jpg`, `image/png`, `image/gif` and `image/webp`. You can omit it when `data` is a `Blob` whose `type` is set.
- `name`: the asset name.
- `description` and `folderId`: optional.

The example builds a small PNG in code, so it needs no file.

To send the bytes yourself, call the two API steps, as the second upload in the example does. Call `assets.createImageUpload`, send the file with `PUT` to `uploadUrl`, then pass the `uploadKey` to `assets.createImage`. The server records the file's real size, type and pixel dimensions.

An image asset is always hosted on LegendKeeper storage. To show an image in content, such as an `image` block or a resource `banner`, use the asset's `url`. Image fields accept no other URL, and no operation registers an image from another URL.

Details:

- `assets.uploadImage` holds the whole file in memory and sends its byte length and SHA-256 with `assets.createImageUpload`. Storage refuses bytes that do not match.
- `assets.uploadImage` sends the bytes to `uploadUrl` with only the returned `headers`, never the API key. When storage refuses them, it throws a `LegendKeeperError` that includes the storage status.
- `expiresAt` is ten minutes after the `assets.createImageUpload` call.
- A stored file that is not an image of an accepted type fails with 400 `VALIDATION_ERROR` at `uploadKey`.

Uploads count against the project owner's plan and the uploading user:

| Limit | Answer |
| --- | --- |
| The project owner's storage quota: 100 GB, across every project they own | 413 `STORAGE_QUOTA_EXCEEDED`, from either step. |
| Upload bytes per uploading user in a rolling 24 hours: 10 GB | 429 `UPLOAD_RATE_EXCEEDED` with `Retry-After` |
| Uploads per uploading user: 50 a minute and 500 an hour | 429 `UPLOAD_RATE_EXCEEDED` |
| `assets.createImageUpload` calls per IP address: 20 a minute and 200 an hour | 429 `RATE_LIMITED` |

The client retries a 429 like any other. See [Retries](#retries).

### search

```ts
import { LegendKeeper } from '@legendkeeper/sdk'
import { p } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const iceKing = await lk.resources.create({ name: 'The Ice King', aliases: ['Simon Petrikov'] })
try {
  const page = iceKing.documents[0]!
  await lk.documents.replaceBlocks(
    { resourceId: iceKing.id, documentId: page.id },
    { blocks: [p('Kidnaps princesses. Writes fan fiction about Fionna and Cake.')] },
  )

  for (const query of ['Ice King', 'Simon Petrikov', 'Fionna']) {
    const hits = await lk.search.search({ q: query, limit: 10 })
    for (const hit of hits.data) {
      const where = hit.document ? `in ${hit.document.name}: ${hit.document.highlights?.[0]?.segment}` : 'by name'
      const trail = (hit.resource.path ?? []).map((ancestor) => ancestor.name).join(' / ')
      console.log(`${query} -> ${hit.resource.name} ${where} ${trail}`)
    }
  }
} finally {
  await lk.resources.delete({ resourceId: iceKing.id })
}
```

| Operation | Does |
| --- | --- |
| `search.search` | Resources whose name, aliases or document content match `q`, best match first, up to `limit` (1 to 100, default 32). |

Each result is `{ resource, document? }`. `resource` has the resource's `id`, `name`, icon fields, `parentId`, `tags` and `path`, its ancestors from the root down. `document` is present when the match is in a document's content, and has the document's `id`, `name` and `highlights`, the matching passage.

`search.search` returns one page of results and does not paginate.

### tags

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const finn = await lk.resources.create({ name: 'Finn', tags: ['NPC', 'Tree Fort', 'Hero'] })
const jake = await lk.resources.create({ name: 'Jake', tags: ['NPC', 'Tree Fort', 'Dog'] })
try {
  for (const { tag, count } of (await lk.tags.list()).data) console.log(`${tag}: ${count}`)
} finally {
  await lk.resources.delete({ resourceId: finn.id })
  await lk.resources.delete({ resourceId: jake.id })
}
```

| Operation | Does |
| --- | --- |
| `tags.list` | Lists every distinct tag on the project's resources with `count`, the number of resources that have it, most used first. Resources in the trash are not counted. ADMIN role. |

### members and invites

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

for (const member of (await lk.members.list()).data) console.log(member.role, member.name ?? member.email ?? member.id)

const email = `new-player-${Date.now()}@example.com`
const result = await lk.members.invite({ email })
console.log(result.success, result.alreadyMember ?? false, result.alreadyInvited ?? false)

const pending = await lk.invites.list()
const invite = pending.data.find((item) => item.email === email)
if (!invite) throw new Error(`no pending invite for ${email}`)
console.log(invite.role, invite.expiresAt)

await lk.invites.revoke({ inviteId: invite.id })
console.log((await lk.invites.list()).data.some((item) => item.id === invite.id))
```

| Operation | Does |
| --- | --- |
| `members.list` | Lists every member with their `role`: `OWNER`, `ADMIN` or `MEMBER`. A member's `id` is their user id. `email` is null unless you have the ADMIN role. |
| `members.invite` | Invites an `email` as a `MEMBER`. Creates a pending invite that expires after 7 days and emails an accept link. ADMIN role. |
| `members.remove` | Removes a member. You can remove a member whose role ranks below yours, and any member other than the owner can remove themselves. |
| `invites.list` | Lists pending invites, with `email`, `role` and `expiresAt`. ADMIN role. |
| `invites.revoke` | Revokes a pending invite so its link no longer works. ADMIN role. |

Every invite sends an email, so `members.invite` is rate limited. When the project has too many pending invites, it fails with 409 `TOO_MANY_PENDING_INVITES` until invites are revoked, accepted or expire.

A key acts with its creator's role, capped at the key's own role. An ADMIN key can remove only members with the MEMBER role. Change roles in the app.

Details:

- The `members.invite` limits also apply to invites sent from the app.
- `members.invite` throws 409 `TOO_MANY_PENDING_INVITES` as `ConflictError`. Waiting for the rate limits to reset does not clear it.

### projects

```ts
import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const project = await lk.project()
console.log(project.id, project.name, project.isPublic)

const listed = await lk.projects.list()
console.log(listed.data.length, listed.data[0]?.id === project.id)

const fetched = await lk.projects.get({ projectId: project.id })
console.log(fetched.createdAt)
```

| Operation | Does |
| --- | --- |
| `projects.list` | Returns a page of your projects. With an API key, the page holds only the key's project. Paginated. |
| `projects.get` | Returns the project: `id`, `name`, `isPublic` and `createdAt`. |

`lk.project()` returns the same object as `projects.get` for the key's project.

## The CLI

The package includes a CLI that calls any operation by namespace and method and prints the JSON response. Run it with `npx @legendkeeper/sdk`.

```sh
npx @legendkeeper/sdk --help
npx @legendkeeper/sdk resources --help
npx @legendkeeper/sdk projects list --pretty
npx @legendkeeper/sdk resources list --query.limit 5 --paginate

created=$(npx @legendkeeper/sdk resources create --body '{"name":"The Tree Fort","tags":["Home"]}')
id=$(node -p 'JSON.parse(process.argv[1]).id' "$created")
npx @legendkeeper/sdk resources update --resourceId "$id" --body '{"name":"Finn and Jake’s Tree Fort"}'
npx @legendkeeper/sdk resources get --resourceId "$id" --pretty
npx @legendkeeper/sdk resources delete --resourceId "$id"
```

`npx @legendkeeper/sdk --help` lists the namespaces. `npx @legendkeeper/sdk <namespace> --help` lists each operation with its HTTP method, path and path parameters.

| Flag | Effect |
| --- | --- |
| `--<pathParam> value` | A path parameter, such as `--resourceId`. `--projectId` is optional because the key determines its project. |
| `--query.<name> value` | A query parameter, such as `--query.limit 5`. |
| `--body '<json>'` | The request body as a JSON object. `--body @file.json` reads it from a file. |
| `--if-match <version>` | Sends the version as `ifMatch`. |
| `--paginate` | Follows every page of a list and prints one array of all items. |
| `--pretty` | Indents the JSON. |
| `--api-key <key>` | The key. Defaults to `LEGENDKEEPER_API_KEY`. |
| `--base-url <url>` | The server. Defaults to `LEGENDKEEPER_BASE_URL`, then production. |

Use `--name=value` when a value starts with `--`. Without `--paginate`, a list prints its first page as `{ data, hasMore, nextCursor }`. An operation that returns nothing, such as a delete, prints `null`.

The command exits with one of these codes:

- 0: success.
- 1: an API or connection error. An API error is printed to stderr as JSON with `status`, `message`, `code`, `requestId` and `errors`. A connection error prints `message` and `code: "CONNECTION_ERROR"`.
- 2: a usage error, such as an unknown flag or a missing path parameter.

## The escape hatch

```ts
import { LegendKeeper, NotFoundError } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const project = await lk.project()

type CalendarList = { data: { id: string; name?: string }[] }
const calendars = await lk.request<CalendarList>({
  method: 'GET',
  path: `/api/v3/projects/${project.id}/calendars`,
  headers: { 'x-request-id': 'guide-escape-hatch' },
})
console.log(calendars.data.length, 'calendars')

const created = await lk.request<{ id: string; name: string }>({
  method: 'POST',
  path: `/api/v3/projects/${project.id}/resources`,
  body: { name: 'The Tree Fort' },
})
await lk.request({ method: 'DELETE', path: `/api/v3/projects/${project.id}/resources/${created.id}` })

try {
  await lk.request({ method: 'GET', path: `/api/v3/projects/${project.id}/resources/${created.id}` })
} catch (error) {
  if (!(error instanceof NotFoundError)) throw error
  console.log(`deleted: ${error.code}`)
}
```

Use `lk.request({ method, path, query, body, headers, signal })` for an endpoint that this version of the SDK does not wrap yet. It sends the request with the client's key, base URL, timeout, retries and error mapping. It does not generate an `Idempotency-Key`: for a `POST`, pass one in `headers` so that a retry cannot apply the write twice. It resolves with the parsed JSON body, typed as the type argument (`unknown` by default).

The client sends `path` as written and does not fill in `projectId` or other parameters. Build the full path yourself, as the example does with `lk.project()`.

Details:

- `query` values are converted with `String()`. `undefined` and `null` values are left out.
- `body` is sent as JSON, and `headers` are added to the request.
- An error status throws the same classes as a wrapped call.

## TypeScript types

```ts
import { LegendKeeper, type Operation, type Options, type Result, type components } from '@legendkeeper/sdk'
import { BlockKind, h, p, plainText, type Block, type HeadingBlock } from '@legendkeeper/sdk/blocks'

type Resource = components['schemas']['Resource']
type CreateResource = Extract<Operation, { id: 'createResource' }>
type CreateResourceOptions = Options<CreateResource>
type CreatedResource = Result<CreateResource>

function headings(blocks: readonly Block[]): string[] {
  return blocks.filter((block): block is HeadingBlock => block.kind === BlockKind.heading).map((block) => plainText(block))
}

function summary(resource: Resource): string {
  return `${resource.name}: ${resource.documents.length} documents, tags ${resource.tags.join(', ')}`
}

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const options: CreateResourceOptions = { name: 'Ice Kingdom', tags: ['Kingdom'] }
const created: CreatedResource = await lk.resources.create(options)
try {
  const page = created.documents[0]!
  const written = await lk.documents.replaceBlocks(
    { resourceId: created.id, documentId: page.id },
    { blocks: [h(1, 'Ice Kingdom'), p('Cold. Full of penguins.'), h(2, 'Residents'), p('The Ice King, and Gunter, who is the dangerous one.')] },
  )
  console.log(headings(written.blocks))
  console.log(summary(await lk.resources.get({ resourceId: created.id })))
} finally {
  await lk.resources.delete({ resourceId: created.id })
}
```

The package exports:

- `components`, the generated schema types. Every schema in the [OpenAPI spec](https://www.legendkeeper.com/api/v3/openapi.json) is there by name. For example, `components['schemas']['Resource']` is a resource as `resources.get` returns it.
- `paths`, the generated path types.
- `Operation`, the union of every operation in the client. Select one with `Extract<Operation, { id: 'createResource' }>`. The ids are the `operationId` values in the reference.
- `Options<O>` and `Result<O>`, the options and result type of one operation.
- `Page<T>` and `ListEnvelope<T>`, the list types.
- `ErrorCode`, `ErrorBody` and `ErrorIssue`, and every error class.
- From `@legendkeeper/sdk/blocks`: `Block`, one type per kind (such as `HeadingBlock`), `Run`, `DocumentBlocks`, `PropertyBlock` and the enum types.

`Block` is a union discriminated by `kind`, so a `kind` check narrows it, as `headings` does in the example. Results of versioned operations add `version: string`. List operations resolve to `Page<Item>`.

## Worked example

This example builds a small Land of Ooo and deletes it at the end, the uploaded image included. It creates:

- A world resource with three kingdoms under it. Each kingdom has a sidebar property and a page.
- An overview page that mentions every kingdom.
- A map with a generated image, a pin for each kingdom, and one for the Tree Fort. The pins are placed by pixel with `pixelToPos`, as [Map images](#map-images) describes.
- A timeline from the Great Mushroom War to the Enchiridion, in the Gregorian calendar. [Calendars](#calendars) shows a timeline in a calendar of Ooo's own.

The example draws the 1024 by 768 PNG map image in code, so it needs no file.

```ts
import { deflateSync } from 'node:zlib'
import { LegendKeeper, pixelToPos } from '@legendkeeper/sdk'
import { callout, h, keyValue, mention, p, plainText, property, ul } from '@legendkeeper/sdk/blocks'

type Rgb = [number, number, number]
type Kingdom = { name: string; ruler: string; summary: string; landmarks: [string, ...string[]]; pixel: [number, number]; color: Rgb }

const kingdoms: Kingdom[] = [
  { name: 'Candy Kingdom', ruler: 'Princess Bubblegum', summary: 'Candy people, a castle, and a princess who runs it like a lab.', landmarks: ['Candy Castle', 'Candy Village'], pixel: [520, 420], color: [255, 160, 200] },
  { name: 'Ice Kingdom', ruler: 'The Ice King', summary: 'A lonely king, a mountain of ice and far too many penguins.', landmarks: ['Ice Castle', 'The fan fiction shelf'], pixel: [220, 170], color: [220, 240, 255] },
  { name: 'Fire Kingdom', ruler: 'Flame Princess', summary: 'Hot enough that Finn needed a fire shield to visit.', landmarks: ['Fire Palace'], pixel: [830, 610], color: [255, 110, 40] },
]
const treeFort: [number, number] = [400, 520]
const grass: Rgb = [120, 200, 90]

const kingdomAt = (x: number, y: number) => kingdoms.find(({ pixel }) => Math.hypot(x - pixel[0], y - pixel[1]) < 110)

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo', tags: ['World'] })
const art = await lk.assets.uploadImage({ data: png(1024, 768, (x, y) => kingdomAt(x, y)?.color ?? grass), contentType: 'image/png', name: 'Map of Ooo' })
const created: { id: string; name: string; pixel: [number, number] }[] = []
try {
  for (const kingdom of kingdoms) {
    const resource = await lk.resources.create({ name: kingdom.name, parentId: ooo.id, tags: ['Kingdom'] })
    created.push({ id: resource.id, name: resource.name, pixel: kingdom.pixel })
    await lk.properties.create({ resourceId: resource.id }, property(keyValue([['Ruler', kingdom.ruler]]), { title: 'Rule' }))
    const page = resource.documents[0]!
    const written = await lk.documents.replaceBlocks(
      { resourceId: resource.id, documentId: page.id },
      { blocks: [h(2, kingdom.name), p(kingdom.summary, ' Part of ', mention({ resourceId: ooo.id }), '.'), ul(...kingdom.landmarks)] },
    )
    console.log(plainText(written))
  }

  const overview = ooo.documents[0]!
  await lk.documents.replaceBlocks(
    { resourceId: ooo.id, documentId: overview.id },
    {
      blocks: [
        h(2, 'Kingdoms'),
        ...created.map((kingdom) => p(mention({ resourceId: kingdom.id }))),
        callout('note', ['Everything here grew back after the Mushroom War.']),
      ],
    },
  )

  const mapDocument = await lk.documents.create({ resourceId: ooo.id }, { name: 'Map of Ooo', type: 'map' })
  const map = { resourceId: ooo.id, documentId: mapDocument.id }
  const { mapImage } = await lk.documents.update(map, { mapImage: { assetId: art.id } })
  if (!mapImage) throw new Error('the map has an image')
  const folder = await lk.features.create(map, { type: 'folder', name: 'Kingdoms' })
  for (const kingdom of created) {
    const pos = pixelToPos(mapImage, ...kingdom.pixel)
    await lk.features.create(map, { type: 'pin', name: kingdom.name, pos, parentId: folder.id, uri: `lk://resources/${kingdom.id}` })
  }
  await lk.features.create(map, { type: 'pin', name: 'The Tree Fort', pos: pixelToPos(mapImage, ...treeFort), iconGlyph: 'tree' })

  const timelineDocument = await lk.documents.create({ resourceId: ooo.id }, { name: 'History of Ooo', type: 'time' })
  const timeline = { resourceId: ooo.id, documentId: timelineDocument.id }
  const before = await lk.timelines.createLane(timeline, { name: 'Before Finn', rank: 'a0', size: 'lg' })
  const after = await lk.timelines.createLane(timeline, { name: 'Finn and Jake', rank: 'a1', size: 'lg' })
  const events = [
    { laneId: before.id, name: 'The Great Mushroom War', formattedStart: '2000' },
    { laneId: before.id, name: 'Simon finds a lost little girl named Marceline', formattedStart: '2001' },
    { laneId: before.id, name: 'The crown wins; Simon is the Ice King', formattedStart: '2010' },
    { laneId: after.id, name: 'Finn and Jake find the Enchiridion', formattedStart: '3012' },
  ]
  for (const event of events) await lk.timelines.createEvent(timeline, { ...event, type: 'event' })

  for await (const event of await lk.timelines.listEvents(timeline)) console.log(event.formattedStart, event.name)
  console.log((await lk.features.list(map, { type: 'pin' })).data.map((pin) => pin.name).join(', '))
} finally {
  for (const kingdom of created) await lk.resources.delete({ resourceId: kingdom.id })
  await lk.resources.delete({ resourceId: ooo.id })
  await lk.assets.delete({ assetId: art.id })
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const chunk = Buffer.alloc(body.length + 8)
  chunk.writeUInt32BE(data.length, 0)
  body.copy(chunk, 4)
  chunk.writeUInt32BE(crc32(body), body.length + 4)
  return chunk
}

function png(width: number, height: number, colorAt: (x: number, y: number) => Rgb): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const stride = width * 3 + 1
  const rows = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) rows.set(colorAt(x, y), y * stride + 1 + x * 3)
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', new Uint8Array())])
}
```

## Reference

- API reference: https://www.legendkeeper.com/developers/api/
- SDK reference: https://www.legendkeeper.com/developers/sdk/
- OpenAPI spec: https://www.legendkeeper.com/api/v3/openapi.json
