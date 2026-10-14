import { LegendKeeper } from '@legendkeeper/sdk'
import { collection, h, p } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const kingdom = await lk.resources.create({ name: 'Candy Kingdom', tags: ['Location', 'Candy Kingdom'] })
const residents = []
for (const resident of [
  { name: 'Princess Bubblegum', tags: ['NPC', 'Candy Kingdom', 'Ally'] },
  { name: 'Peppermint Butler', tags: ['NPC', 'Candy Kingdom', 'Ally'] },
  { name: 'Earl of Lemongrab', tags: ['NPC', 'Candy Kingdom', 'Villain'] },
]) {
  residents.push(await lk.resources.create({ ...resident, parentId: kingdom.id }))
}
try {
  const written = await lk.documents.replaceBlocks(
    { resourceId: kingdom.id, documentId: kingdom.documents[0]!.id },
    {
      blocks: [
        p('The candy-coated capital of Ooo.'),
        h(2, 'Residents'),
        collection({
          filter: { type: 'filter', filterType: 'field', id: 'residents', field: 'parentId', operator: 'equals', value: '$self' },
          isTitleHidden: true,
        }),
        h(2, 'Allies'),
        collection({
          filter: { type: 'filter', filterType: 'tag', id: 'allies', operator: 'has_all', tags: ['NPC', 'Ally'] },
          isTitleHidden: true,
        }),
      ],
    },
  )
  for (const block of written.blocks) {
    if (block.kind === 'resourceCollection') console.log(block.filter?.filterType, block.isTitleHidden)
  }
} finally {
  for (const resident of residents) await lk.resources.delete({ resourceId: resident.id })
  await lk.resources.delete({ resourceId: kingdom.id })
}
