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
