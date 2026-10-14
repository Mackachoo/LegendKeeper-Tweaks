/**
 * A small in-memory LegendKeeper v3 API for tests. Every request is routed through the
 * real OpenAPI spec: unknown routes answer 404/405, and request bodies are validated
 * against the operation's schema exactly as the live API rejects unknown fields.
 */
import { createServer, type Server } from 'node:http'
import { randomUUID } from 'node:crypto'
import { spec, validate } from './schema.js'

type Json = any

const routes = Object.entries(spec.paths as Record<string, Record<string, Json>>).flatMap(([template, ops]) =>
  Object.entries(ops).filter(([m]) => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).map(([method, op]) => {
    const names: string[] = []
    const re = new RegExp('^' + template.replace(/\{(\w+)\}/g, (_, n) => (names.push(n), '([^/]+)')) + '$')
    const ref = op.requestBody?.content?.['application/json']?.schema?.$ref as string | undefined
    return { method: method.toUpperCase(), re, names, id: op.operationId as string, bodySchema: ref?.split('/').pop() }
  }))

const newId = () => 'r' + randomUUID().replaceAll('-', '').slice(0, 23)
const err = (status: number, code: string, message: string, errors?: Json[]) => ({ status, body: { message, code, requestId: randomUUID(), ...(errors ? { errors } : {}) } })

export class MockLegendKeeper {
  project = { id: 'pooo00001', name: 'The Land of Ooo', isPublic: false, createdAt: '2026-01-01T00:00:00Z' }
  resources = new Map<string, Json>()
  docs = new Map<string, Json>() // documentId -> doc (with resourceId, blocks, version, features, lanes, events)
  calls: { id: string; body?: Json }[] = []
  server?: Server
  url = ''
  rank = 0

  addResource(r: Partial<Json> & { name: string }, docType: string = 'blank', blocks: Json[] = []) {
    const id = r.id ?? newId()
    const docId = 'd' + newId().slice(1)
    this.resources.set(id, { id, tags: [], aliases: [], isHidden: false, rank: `a${(this.rank++).toString().padStart(3, '0')}`, parentId: null, properties: [], ...r })
    this.docs.set(docId, { id: docId, resourceId: id, name: 'Main', type: docType, rank: 'a0', isHidden: false, blocks: this.ids(blocks), version: 'v1', features: [], lanes: [], events: [], mapImage: null })
    return { id, docId }
  }

  private ids(blocks: Json[]): Json[] {
    const walk = (b: Json): Json => ({ ...b, id: b.id ?? 'b' + newId().slice(1, 9), ...(b.children ? { children: b.children.map(walk) } : {}), ...(b.kind === 'infobox' ? { rows: b.rows.map((r: Json) => ({ id: r.id ?? 'p' + newId().slice(1, 9), ...r })) } : {}) })
    return blocks.map(walk)
  }

  private resourceView(r: Json) {
    const documents = [...this.docs.values()].filter((d) => d.resourceId === r.id).map(({ id, name, type, rank, isHidden }) => ({ id, name, type, rank, isHidden }))
    return { ...r, documents }
  }

  private text(blocks: Json[]): string {
    const out: string[] = []
    const walk = (b: Json) => {
      if (b.content) out.push(b.content.map((r: Json) => r.text ?? r.mention?.text ?? '').join(''))
      for (const c of b.children ?? []) walk(c)
    }
    blocks.forEach(walk)
    return out.join('\n')
  }

  handle(method: string, path: string, query: URLSearchParams, body: Json, headers: Record<string, string | undefined>): { status: number; body?: Json } {
    const route = routes.find((r) => r.re.test(path) && r.method === method)
    if (!route) return routes.some((r) => r.re.test(path)) ? err(405, 'METHOD_NOT_ALLOWED', 'no') : err(404, 'NOT_FOUND', 'no route ' + method + ' ' + path)
    const m = route.re.exec(path)!
    const p: Record<string, string> = Object.fromEntries(route.names.map((n, i) => [n, decodeURIComponent(m[i + 1]!)]))
    this.calls.push({ id: route.id, body })
    if (headers.authorization !== 'Bearer lk_test') return err(401, 'UNAUTHENTICATED', 'bad key')
    if (p.projectId && p.projectId !== this.project.id) return err(403, 'WRONG_PROJECT', 'wrong project')
    if (route.bodySchema && body !== undefined) {
      const problems = validate(route.bodySchema, body)
      if (problems.length) return err(400, 'VALIDATION_ERROR', `Invalid ${route.bodySchema}`, problems.map((m) => ({ path: m.split(' ')[0], message: m })))
    }
    const res = p.resourceId ? this.resources.get(p.resourceId) : undefined
    if (p.resourceId && !res && route.id !== 'restoreResource') return err(404, 'NOT_FOUND', 'resource')
    const doc = p.documentId ? this.docs.get(p.documentId) : undefined
    if (p.documentId && (!doc || doc.resourceId !== p.resourceId)) return err(404, 'NOT_FOUND', 'document')
    const checkVersion = () => headers['if-match'] && headers['if-match'] !== doc.version ? err(412, 'VERSION_MISMATCH', `Document is at version ${doc.version}`) : undefined
    const bump = () => (doc.version = 'v' + (Number(doc.version.slice(1)) + 1))
    const convert = (type: string) => { if (doc.type === 'blank') doc.type = type; else if (doc.type !== type) return err(400, 'KIND_MISMATCH', 'kind') }
    const list = (data: Json[]) => ({ status: 200, body: { data, hasMore: false, nextCursor: null } })

    switch (route.id) {
      case 'listProjects': return list([this.project])
      case 'getProject': return { status: 200, body: this.project }
      case 'listResources': {
        let all = [...this.resources.values()]
        if (query.get('parentId')) all = all.filter((r) => r.parentId === query.get('parentId'))
        // Page by 2 to exercise cursor pagination.
        const start = Number(query.get('cursor') ?? 0)
        const limit = Math.min(2, Number(query.get('limit') ?? 2))
        const page = all.slice(start, start + limit).map((r) => this.resourceView(r))
        const more = start + limit < all.length
        return { status: 200, body: { data: page, hasMore: more, nextCursor: more ? String(start + limit) : null } }
      }
      case 'createResource': {
        if (body.parentId && !this.resources.has(body.parentId)) return err(404, 'NOT_FOUND', 'parent')
        const { documents, after, before, ...fields } = body
        const { id } = this.addResource({ ...fields, parentId: body.parentId ?? null })
        if (documents) {
          for (const d of [...this.docs.values()]) if (d.resourceId === id) this.docs.delete(d.id)
          documents.forEach((d: Json, i: number) => {
            const docId = 'd' + newId().slice(1)
            this.docs.set(docId, { id: docId, resourceId: id, name: d.name ?? 'Main', type: d.type ?? (d.blocks ? 'page' : 'blank'), rank: `a${i}`, isHidden: false, blocks: this.ids(d.blocks ?? []), version: 'v1', features: [], lanes: [], events: [] })
          })
        }
        return { status: 201, body: this.resourceView(this.resources.get(id)) }
      }
      case 'getResource': return { status: 200, body: this.resourceView(res) }
      case 'updateResource': Object.assign(res, body); return { status: 200, body: this.resourceView(res) }
      case 'moveResource': if ('parentId' in body) res.parentId = body.parentId; return { status: 200, body: this.resourceView(res) }
      case 'deleteResource': {
        const kids = [...this.resources.values()].filter((r) => r.parentId === res.id)
        if (kids.length && query.get('cascade') !== 'true') return err(409, 'HAS_CHILDREN', 'has children')
        this.resources.delete(res.id)
        return { status: 204 }
      }
      case 'listDocuments': return list([...this.docs.values()].filter((d) => d.resourceId === res.id).map(({ id, name, type, rank, isHidden }) => ({ id, name, type, rank, isHidden })))
      case 'createDocument': {
        const docId = 'd' + newId().slice(1)
        const d = { id: docId, resourceId: res.id, rank: 'b0', isHidden: false, blocks: [], version: 'v1', features: [], lanes: [], events: [], ...body }
        this.docs.set(docId, d)
        return { status: 201, body: { id: docId, name: d.name, type: d.type, rank: d.rank, isHidden: false } }
      }
      case 'getDocument': return { status: 200, body: { id: doc.id, name: doc.name, type: doc.type, rank: doc.rank, isHidden: doc.isHidden, mapImage: doc.mapImage ?? null, calendarId: doc.type === 'time' ? 'gregorian' : undefined } }
      case 'getDocumentBlocks': return { status: 200, body: { id: doc.id, version: doc.version, schema: 1, blocks: doc.blocks, text: this.text(doc.blocks) } }
      case 'replaceDocumentBlocks': {
        const bad = checkVersion() ?? convert('page')
        if (bad) return bad
        doc.blocks = this.ids(body.blocks)
        bump()
        return { status: 200, body: { id: doc.id, version: doc.version, schema: 1, blocks: doc.blocks, text: this.text(doc.blocks) } }
      }
      case 'search': {
        const q = (query.get('q') ?? '').toLowerCase()
        const hits = [...this.resources.values()].flatMap((r) => {
          const docs = [...this.docs.values()].filter((d) => d.resourceId === r.id)
          const inDoc = docs.find((d) => this.text(d.blocks).toLowerCase().includes(q))
          if (r.name.toLowerCase().includes(q)) return [{ resource: { id: r.id, name: r.name, tags: r.tags } }]
          if (inDoc) return [{ resource: { id: r.id, name: r.name, tags: r.tags }, document: { id: inDoc.id, name: inDoc.name, highlights: [{ segment: this.text(inDoc.blocks).slice(0, 60) }] } }]
          return []
        })
        return list(hits)
      }
      case 'listTags': {
        const counts = new Map<string, number>()
        for (const r of this.resources.values()) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
        return list([...counts].map(([tag, count]) => ({ tag, count })))
      }
      case 'listProperties': return list(res.properties)
      case 'createProperty': { const prop = { id: 'p' + newId().slice(1, 9), rank: 'a0', ...body, rows: (body.rows ?? []).map((r: Json) => ({ id: 'w' + newId().slice(1, 9), ...r })) }; res.properties.push(prop); return { status: 201, body: prop } }
      case 'listPropertyRows': return list(res.properties.find((x: Json) => x.id === p.propertyId).rows)
      case 'createPropertyRow': { const row = { id: 'w' + newId().slice(1, 9), ...body }; res.properties.find((x: Json) => x.id === p.propertyId).rows.push(row); return { status: 201, body: row } }
      case 'updatePropertyRow': { const row = res.properties.find((x: Json) => x.id === p.propertyId).rows.find((r: Json) => r.id === p.rowId); Object.assign(row, body); return { status: 200, body: row } }
      case 'deletePropertyRow': { const prop = res.properties.find((x: Json) => x.id === p.propertyId); prop.rows = prop.rows.filter((r: Json) => r.id !== p.rowId); return { status: 204 } }
      case 'listFeatures': return list(doc.features.filter((f: Json) => !query.get('type') || f.type === query.get('type')))
      case 'createFeature': { const bad = convert('map'); if (bad) return bad; const f = { id: 'f' + newId().slice(1, 9), ...body }; doc.features.push(f); return { status: 201, body: f } }
      case 'listLanes': return list(doc.lanes)
      case 'createLane': { const bad = convert('time'); if (bad) return bad; const l = { id: 'l' + newId().slice(1, 9), ...body }; doc.lanes.push(l); return { status: 201, body: l } }
      case 'listEvents': return list(doc.events)
      case 'createEvent': {
        const year = Number(/\d+/.exec(body.formattedStart ?? '')?.[0] ?? 0)
        const e = { id: 'e' + newId().slice(1, 9), start: year * 525600, startDate: { year, month: 1, monthName: 'January', day: 1, hour: 0, minute: 0, era: { id: 'ce', name: 'CE', abbr: 'CE' }, iso: `${year}-01-01` }, ...body }
        doc.events.push(e)
        return { status: 201, body: e }
      }
      default:
        return err(500, 'INTERNAL', `mock does not implement ${route.id}`)
    }
  }

  async start() {
    this.server = createServer(async (req, res) => {
      const chunks: Buffer[] = []
      for await (const c of req) chunks.push(c as Buffer)
      const raw = Buffer.concat(chunks).toString()
      const url = new URL(req.url!, 'http://x')
      const out = this.handle(req.method!, url.pathname.replace(/(.)\/$/, '$1'), url.searchParams, raw ? JSON.parse(raw) : undefined, req.headers as Record<string, string>)
      const version = out.body?.version
      res.writeHead(out.status, { 'content-type': 'application/json', 'x-request-id': randomUUID(), ...(version ? { etag: version } : {}) })
      res.end(out.status === 204 ? undefined : JSON.stringify(out.body))
    })
    await new Promise<void>((r) => this.server!.listen(0, '127.0.0.1', r))
    const addr = this.server.address() as { port: number }
    this.url = `http://127.0.0.1:${addr.port}`
    return this
  }

  stop() {
    this.server?.close()
  }
}
