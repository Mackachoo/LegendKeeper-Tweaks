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
