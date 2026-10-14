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
