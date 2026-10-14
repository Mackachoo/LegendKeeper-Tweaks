import { LegendKeeper } from '@legendkeeper/sdk'
import { bold, br, keyValue } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const bmo = await lk.resources.create({ name: 'BMO' })
try {
  const page = bmo.documents[0]!
  const written = await lk.documents.replaceBlocks(
    { resourceId: bmo.id, documentId: page.id },
    { blocks: [keyValue([['Lives in', 'The Tree Fort'], ['Plays', 'Video games']])] },
  )
  const specsId = written.blocks[0]?.id
  if (!specsId) throw new Error('the keyValue block has an id')
  const specs = { resourceId: bmo.id, documentId: page.id, blockId: specsId }

  const rows = await lk.blocks.listRows(specs)
  const plays = rows.data.find((row) => row.key === 'Plays')
  if (!plays?.id) throw new Error('the Plays row has no id')

  const friend = await lk.blocks.createRow(specs, {
    key: 'Best friend',
    content: [...bold('Football'), br, { text: 'the reflection in the bathroom mirror' }],
    after: plays.id,
  })
  if (!friend.id) throw new Error('the new row has no id')
  console.log(friend.key, JSON.stringify(friend.text))

  await lk.blocks.updateRow({ ...specs, rowId: plays.id }, { text: 'Guardians of Sunshine' })
  await lk.blocks.deleteRow({ ...specs, rowId: friend.id })

  for (const row of (await lk.blocks.listRows(specs)).data) console.log(`${row.key}: ${row.text}`)
} finally {
  await lk.resources.delete({ resourceId: bmo.id })
}
