import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { h, p, infobox, property, keyValue, collection, image } from '@legendkeeper/sdk/blocks'
import { MockLegendKeeper } from './mock-api.js'

const mock = await new MockLegendKeeper().start()
process.env.LEGENDKEEPER_BASE_URL = mock.url
const { loadConfig } = await import('../src/world.js')
const { buildServer, startHttp } = await import('../src/index.js')

// Seed a small world.
const ooo = mock.addResource({ name: 'The Land of Ooo', tags: ['World'] }, 'page', [p('A land after the Mushroom War.')])
const candy = mock.addResource({ name: 'Candy Kingdom', parentId: ooo.id, tags: ['Location'] }, 'page', [
  infobox(property(keyValue([['Ruler', 'Princess Bubblegum']]), { title: 'Facts' })),
  h(1, 'Candy Kingdom'),
  p('A kingdom of candy.'),
  collection({ items: [ooo.id], isTitleHidden: true }),
  image('https://www.legendkeeper.com/assets/flag.png', { fill: true, title: 'Flag', isTitleHidden: false }),
])
const pb = mock.addResource({ name: 'Princess Bubblegum', parentId: candy.id, tags: ['NPC', 'Ally'], aliases: ['PB'] })
mock.addResource({ name: 'Ice Kingdom', parentId: ooo.id, tags: ['Location'] })
mock.addResource({ name: 'Gunter', parentId: ooo.id })
mock.addResource({ name: 'Gunter', parentId: candy.id })
const atlas = mock.addResource({ name: 'Atlas', parentId: ooo.id }, 'map')
const history = mock.addResource({ name: 'History', parentId: ooo.id })

async function connect(env: Record<string, string>) {
  const config = loadConfig({ LEGENDKEEPER_API_KEY: 'lk_test', ...env })
  const server = buildServer(config)
  const [a, b] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test', version: '1' })
  await Promise.all([server.connect(a), client.connect(b)])
  return client
}

const client = await connect({})
async function call(name: string, args: Record<string, unknown> = {}) {
  const r = (await client.callTool({ name, arguments: args })) as { content: { text: string }[]; isError?: boolean }
  return { text: r.content.map((c) => c.text).join('\n'), isError: Boolean(r.isError) }
}
async function ok(name: string, args: Record<string, unknown> = {}) {
  const r = await call(name, args)
  assert.equal(r.isError, false, `${name} failed: ${r.text}`)
  return r.text
}

export const tests: [string, () => Promise<void>][] = []
const test = (name: string, fn: () => Promise<void>) => tests.push([name, fn])
export const teardown = () => mock.stop()

test('lists all tools with annotations; read-only mode hides writes', async () => {
  const { tools } = await client.listTools()
  assert.equal(tools.length, 17)
  const del = tools.find((t) => t.name === 'delete_resource')!
  assert.equal(del.annotations?.destructiveHint, true)
  assert.equal(tools.find((t) => t.name === 'search')!.annotations?.readOnlyHint, true)
  const ro = await connect({ LEGENDKEEPER_READ_ONLY: '1' })
  const roTools = (await ro.listTools()).tools.map((t) => t.name).sort()
  assert.deepEqual(roTools, ['api_request', 'browse', 'get_resource', 'list_tags', 'list_worlds', 'read_document', 'search'])
})

test('list_worlds and browse walk the paginated tree', async () => {
  assert.match(await ok('list_worlds'), /default: "The Land of Ooo"/)
  const tree = await ok('browse', { depth: 3 })
  assert.match(tree, /8 resources/)
  assert.match(tree, /^- The Land of Ooo \[/m)
  assert.match(tree, /^    - Princess Bubblegum \[.*tags: NPC, Ally/m)
  assert.match(await ok('browse', { tag: 'Location' }), /2 resources tagged "Location"/)
})

test('search and get_resource render content with rich-block placeholders', async () => {
  assert.match(await ok('search', { query: 'candy' }), /Candy Kingdom \[/)
  const out = await ok('get_resource', { resource: 'Candy Kingdom' })
  assert.match(out, /path: The Land of Ooo/)
  assert.match(out, /children: Princess Bubblegum/)
  assert.match(out, /<!-- lk:keep id=\S+ kind=infobox \| Facts: Ruler=Princess Bubblegum -->/)
  assert.match(out, /# Candy Kingdom\n\nA kingdom of candy\./)
  assert.match(out, /kind=image/)
  // Aliases resolve, ambiguous names explain themselves.
  assert.match(await ok('get_resource', { resource: 'PB', include_content: false }), /# Princess Bubblegum/)
  const amb = await call('get_resource', { resource: 'Gunter' })
  assert.equal(amb.isError, true)
  assert.match(amb.text, /matches 2 resources/)
})

test('create_resource writes schema-valid content with resolved mentions and facts', async () => {
  const out = await ok('create_resource', {
    name: 'Peppermint Butler', parent: 'Candy Kingdom', tags: ['NPC'], icon_glyph: 'user',
    facts: { Role: 'Butler', Loyalty: 'Princess Bubblegum' },
    content: '## Who\n\nServes [[Princess Bubblegum]] and knows [[Nobody Real]].\n\n> [!secret]\n> Dabbles in dark magic.',
  })
  assert.match(out, /Created Peppermint Butler \[\S+\] under Candy Kingdom/)
  assert.match(out, /\[\[Nobody Real\]\] did not match/)
  const body = mock.calls.filter((c) => c.id === 'createResource').at(-1)!.body
  const blocks = body.documents[0].blocks
  assert.equal(blocks[0].kind, 'infobox')
  assert.ok(JSON.stringify(blocks).includes(`"resourceId":"${pb.id}"`))
  assert.equal(blocks.at(-1).kind, 'secret')
})

test('write_page appends, refuses to drop rich blocks, and replaces safely', async () => {
  await ok('write_page', { resource: 'Candy Kingdom', markdown: '## Exports\n\nCandy, science.' })
  let read = await ok('read_document', { resource: 'Candy Kingdom', with_block_ids: true })
  assert.match(read, /## Exports/)
  const version = /version: (\S+)/.exec(read)![1]

  const refused = await call('write_page', { resource: 'Candy Kingdom', mode: 'replace', markdown: '# Just text' })
  assert.equal(refused.isError, true)
  assert.match(refused.text, /would remove 3 rich block/)

  // Rewrite keeping placeholders and ids: the infobox and collection survive, ids are stable.
  const md = read.slice(read.indexOf('\n\n', read.indexOf('version:')) + 2).replace(/\n\n\(Lines like[\s\S]*$/, '')
  const edited = md.replace('A kingdom of candy.', 'A kingdom of candy, ruled by [[PB]].')
  await ok('write_page', { resource: 'Candy Kingdom', mode: 'replace', markdown: edited, expected_version: version })
  const doc = [...mock.docs.values()].find((d) => d.id === candy.docId)
  assert.deepEqual(doc.blocks.map((b: any) => b.kind), ['infobox', 'heading', 'paragraph', 'resourceCollection', 'image', 'heading', 'paragraph'])
  assert.ok(JSON.stringify(doc.blocks[2]).includes(pb.id))

  // A stale version is rejected with guidance.
  const stale = await call('write_page', { resource: 'Candy Kingdom', mode: 'replace', markdown: edited, expected_version: version })
  assert.equal(stale.isError, true)
  assert.match(stale.text, /412 VERSION_MISMATCH[\s\S]*Read it again/)
})

test('set_facts updates the infobox and the sidebar', async () => {
  const out = await ok('set_facts', { resource: 'Candy Kingdom', facts: { Ruler: 'PB', Population: '5,000', Missing: '' } })
  assert.match(out, /Ruler=PB, Population=5,000/)
  await ok('set_facts', { resource: 'Ice Kingdom', facts: { Ruler: 'Ice King' } })
  const ice = [...mock.docs.values()].find((d) => mock.resources.get(d.resourceId)?.name === 'Ice Kingdom')
  assert.equal(ice.type, 'page')
  assert.equal(ice.blocks[0].kind, 'infobox')
  await ok('set_facts', { resource: 'Ice Kingdom', where: 'sidebar', facts: { Climate: 'Cold' } })
  await ok('set_facts', { resource: 'Ice Kingdom', where: 'sidebar', facts: { Climate: 'Freezing', Penguins: 'Many' } })
  const rows = [...mock.resources.values()].find((r) => r.name === 'Ice Kingdom').properties[0].rows
  assert.deepEqual(rows.map((r: any) => `${r.key}=${r.text}`), ['Climate=Freezing', 'Penguins=Many'])
})

test('maps and timelines', async () => {
  assert.match(await ok('add_map_pin', { resource: 'Atlas', name: 'Candy Kingdom', lat: 10, lng: 20, links_to: 'Candy Kingdom', folder: 'Kingdoms' }), /linked to Candy Kingdom/)
  const noImage = await call('add_map_pin', { resource: 'Atlas', name: 'X', x: 1, y: 2 })
  assert.match(noImage.text, /no image/)
  assert.match(await ok('read_document', { resource: 'Atlas' }), /pin "Candy Kingdom" .* → lk:\/\/resources\/.*folder Kingdoms/)
  await ok('add_timeline_event', { resource: 'History', lane: 'Wars', name: 'Mushroom War', start: '2000', links_to: 'The Land of Ooo' })
  await ok('add_timeline_event', { resource: 'History', lane: 'Wars', name: 'Lich escapes', start: '3012' })
  const tl = await ok('read_document', { resource: 'History' })
  assert.match(tl, /lanes: Wars/)
  assert.equal((tl.match(/lane Wars/g) ?? []).length, 2)
})

test('update, move and delete resources', async () => {
  assert.match(await ok('update_resource', { resource: 'Ice Kingdom', add_tags: ['Cold'], remove_tags: ['Location'] }), /tags Cold/)
  assert.match(await ok('move_resource', { resource: 'Ice Kingdom', new_parent: 'root' }), /the root/)
  const blocked = await call('delete_resource', { resource: 'Candy Kingdom' })
  assert.match(blocked.text, /HAS_CHILDREN[\s\S]*cascade: true/)
  assert.match(await ok('delete_resource', { resource: 'Candy Kingdom', cascade: true }), /Restore with restore_resource/)
})

test('api_request stays inside the project', async () => {
  assert.match(await ok('api_request', { method: 'GET', path: '/tags' }), /"tag"/)
  assert.equal((await call('api_request', { method: 'GET', path: '/../other' })).isError, true)
  assert.equal((await call('api_request', { method: 'GET', path: '/api/v3/projects/someone-else/resources' })).isError, true)
})

test('upload_image refuses private addresses', async () => {
  const r = await call('upload_image', { url: 'http://127.0.0.1:1/x.png', name: 'x' })
  assert.match(r.text, /private or local/)
})

test('HTTP transport requires the bearer token', async () => {
  const config = loadConfig({ LEGENDKEEPER_API_KEY: 'lk_test' })
  const token = 'x'.repeat(32)
  const http = startHttp(config, { port: 0, host: '127.0.0.1', token, path: '/mcp' })
  await new Promise((r) => http.once('listening', r))
  const base = `http://127.0.0.1:${(http.address() as { port: number }).port}`
  try {
    const denied = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: '{}' })
    assert.equal(denied.status, 401)
    assert.equal((await fetch(`${base}/healthz`)).status, 200)
    const remote = new Client({ name: 'remote', version: '1' })
    await remote.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
    assert.equal((await remote.listTools()).tools.length, 17)
    const r = (await remote.callTool({ name: 'list_worlds', arguments: {} })) as { content: { text: string }[] }
    assert.match(r.content[0]!.text, /The Land of Ooo/)
    await remote.close()
  } finally {
    http.close()
  }
})
