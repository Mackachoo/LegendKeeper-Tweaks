import { LegendKeeper } from '@legendkeeper/sdk'
import { infobox, keyValue, p, property, textField } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const jake = await lk.resources.create({ name: 'Jake the Dog' })
try {
  const page = jake.documents[0]!
  const written = await lk.documents.replaceBlocks(
    { resourceId: jake.id, documentId: page.id },
    {
      blocks: [
        infobox(property(keyValue([['Species', 'Magic dog'], ['Age', '28']]), { title: 'Stats' })),
        p('Finn’s brother. Stretches into anything, including a boat, a key and a very large hand.'),
      ],
    },
  )
  const box = written.blocks[0]
  if (box?.kind !== 'infobox') throw new Error('the first block is the infobox')
  const statsId = box.rows[0]?.id
  if (!box.id || !statsId) throw new Error('the infobox and its Stats property have ids')
  const sheet = { resourceId: jake.id, documentId: page.id, blockId: box.id }

  const bio = await lk.blocks.createProperty(sheet, {
    ...property(textField('Got his powers from rolling in a magic mud puddle.'), { title: 'Origin' }),
    before: statsId,
    ifMatch: written.version,
  })
  if (!bio.id) throw new Error('the new property has no id')
  console.log(bio.id, bio.kind, bio.rank)

  await lk.blocks.updateProperty({ ...sheet, propertyId: bio.id }, { title: 'Powers', isTitleHidden: false })
  console.log((await lk.blocks.getProperty({ ...sheet, propertyId: bio.id })).title)

  const stats = { ...sheet, propertyId: statsId }
  const plays = await lk.blocks.createPropertyRow(stats, { key: 'Plays', text: 'viola' })
  if (!plays.id) throw new Error('the new row has no id')
  await lk.blocks.updatePropertyRow({ ...stats, rowId: plays.id }, { text: 'viola, badly, for Lady Rainicorn' })
  for (const row of (await lk.blocks.listPropertyRows(stats)).data) console.log(`${row.key}: ${row.text}`)
  await lk.blocks.deletePropertyRow({ ...stats, rowId: plays.id })

  await lk.blocks.deleteProperty({ ...sheet, propertyId: bio.id })
  for (const item of (await lk.blocks.listProperties(sheet)).data) console.log(item.id, item.kind, item.title)
} finally {
  await lk.resources.delete({ resourceId: jake.id })
}
