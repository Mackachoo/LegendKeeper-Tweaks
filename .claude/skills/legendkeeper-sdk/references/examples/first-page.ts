import { LegendKeeper } from '@legendkeeper/sdk'
import { bold, callout, h, p, plainText, ul } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const kingdom = await lk.resources.create({ name: 'Candy Kingdom' })
try {
  const page = kingdom.documents[0]!
  const doc = { resourceId: kingdom.id, documentId: page.id }

  await lk.documents.replaceBlocks(doc, {
    blocks: [
      h(1, 'Candy Kingdom'),
      p('Ruled by ', bold('Princess Bubblegum'), '. Home of the Candy People.'),
      ul('Candy Castle', 'Candy Village'),
      callout('note', ['The Banana Guards guard the castle.']),
    ],
  })

  const read = await lk.documents.getBlocks(doc)
  console.log(read.blocks.map((block) => block.kind).join(', '))
  console.log(plainText(read))
} finally {
  await lk.resources.delete({ resourceId: kingdom.id })
}
