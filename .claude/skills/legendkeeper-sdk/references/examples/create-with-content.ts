import { LegendKeeper } from '@legendkeeper/sdk'
import { bold, h, p, plainText, ul } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const kingdom = await lk.resources.create({
  name: 'Candy Kingdom',
  documents: [
    {
      name: 'Overview',
      blocks: [
        h(1, 'Candy Kingdom'),
        p('Ruled by ', bold('Princess Bubblegum'), '.'),
        ul('Candy Castle', 'Candy Village'),
      ],
    },
    { name: 'Map', type: 'map' },
  ],
})
try {
  const [overview, map] = kingdom.documents
  console.log(overview!.name, overview!.type, map!.name, map!.type)
  console.log(plainText(await lk.documents.getBlocks({ resourceId: kingdom.id, documentId: overview!.id })))
} finally {
  await lk.resources.delete({ resourceId: kingdom.id })
}
