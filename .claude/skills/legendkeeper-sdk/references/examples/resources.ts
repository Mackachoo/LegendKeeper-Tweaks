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
