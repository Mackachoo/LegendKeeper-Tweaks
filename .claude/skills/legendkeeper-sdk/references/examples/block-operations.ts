import { LegendKeeper } from '@legendkeeper/sdk'
import { bold, h, p, runs, ul } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const fort = await lk.resources.create({ name: 'The Tree Fort' })
try {
  const page = fort.documents[0]!
  const doc = { resourceId: fort.id, documentId: page.id }

  const written = await lk.documents.replaceBlocks(doc, { blocks: [h(1, 'The Tree Fort'), ul('Treasure room', 'BMO’s charging nook')] })
  const [titleId, roomsId] = written.blocks.map((block) => block.id)
  if (!titleId || !roomsId) throw new Error('the written blocks have ids')
  let { version } = written

  const intro = await lk.blocks.insert(doc, { block: p('Where Finn and Jake live.'), after: titleId, ifMatch: version })
  if (!intro.id) throw new Error('the inserted block has an id')
  const introId = intro.id
  version = intro.version

  const updated = await lk.blocks.update(
    { ...doc, blockId: introId },
    { content: runs(['Where Finn and Jake live, with ', bold('BMO'), '.']), ifMatch: version },
  )
  version = updated.version

  const replaced = await lk.blocks.replace({ ...doc, blockId: titleId }, { ...h(2, 'The Tree Fort, home of heroes'), ifMatch: version })
  version = replaced.version

  const moved = await lk.blocks.move({ ...doc, blockId: roomsId }, { before: introId, ifMatch: version })
  version = moved.version

  const rooms = await lk.blocks.get({ ...doc, blockId: roomsId })
  console.log(rooms.kind, rooms.version === version)

  await lk.blocks.delete({ ...doc, blockId: roomsId }, { ifMatch: version })

  const { assigned } = await lk.documents.assignBlockIds(doc)
  console.log(`${assigned} blocks lacked an id`)

  const final = await lk.documents.getBlocks(doc)
  console.log(final.blocks.map((block) => `${block.id}: ${block.kind}`).join('\n'))
} finally {
  await lk.resources.delete({ resourceId: fort.id })
}
