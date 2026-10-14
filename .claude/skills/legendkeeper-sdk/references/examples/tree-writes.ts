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
