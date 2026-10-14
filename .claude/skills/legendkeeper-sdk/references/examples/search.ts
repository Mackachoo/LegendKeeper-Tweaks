import { LegendKeeper } from '@legendkeeper/sdk'
import { p } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const iceKing = await lk.resources.create({ name: 'The Ice King', aliases: ['Simon Petrikov'] })
try {
  const page = iceKing.documents[0]!
  await lk.documents.replaceBlocks(
    { resourceId: iceKing.id, documentId: page.id },
    { blocks: [p('Kidnaps princesses. Writes fan fiction about Fionna and Cake.')] },
  )

  for (const query of ['Ice King', 'Simon Petrikov', 'Fionna']) {
    const hits = await lk.search.search({ q: query, limit: 10 })
    for (const hit of hits.data) {
      const where = hit.document ? `in ${hit.document.name}: ${hit.document.highlights?.[0]?.segment}` : 'by name'
      const trail = (hit.resource.path ?? []).map((ancestor) => ancestor.name).join(' / ')
      console.log(`${query} -> ${hit.resource.name} ${where} ${trail}`)
    }
  }
} finally {
  await lk.resources.delete({ resourceId: iceKing.id })
}
