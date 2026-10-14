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
