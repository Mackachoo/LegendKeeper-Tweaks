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
