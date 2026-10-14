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
