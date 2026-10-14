import { LegendKeeper } from '@legendkeeper/sdk'
import { collection, h, image, infobox, p, property } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const portraitPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const portrait = await lk.assets.uploadImage({ data: portraitPng, contentType: 'image/png', name: 'The Tree Fort' })
const treeFort = await lk.resources.create({ name: 'The Tree Fort' })
const finn = await lk.resources.create({ name: 'Finn the Human' })
const jake = await lk.resources.create({ name: 'Jake the Dog' })
try {
  const doc = { resourceId: treeFort.id, documentId: treeFort.documents[0]!.id }
  const written = await lk.documents.replaceBlocks(doc, {
    blocks: [
      infobox(property(image(portrait.url!, { alt: 'The Tree Fort', fill: true }), { title: 'Portrait', isTitleHidden: true })),
      p('A hollow tree in the Grasslands, home to two heroes.'),
      h(2, 'Residents'),
      collection({ items: [finn.id, jake.id], isTitleHidden: true }),
      collection({ items: [jake.id], title: 'Can stretch', isTitleHidden: false }),
    ],
  })
  for (const block of written.blocks) {
    if (block.kind === 'resourceCollection') console.log(block.title, block.isTitleHidden)
  }

  const residents = written.blocks[3]
  if (!residents?.id) throw new Error('the residents collection has an id')
  const shown = await lk.blocks.update({ ...doc, blockId: residents.id }, { title: 'Everyone', isTitleHidden: false, ifMatch: written.version })
  if (shown.kind === 'resourceCollection') console.log(shown.title, shown.isTitleHidden)
} finally {
  await lk.resources.delete({ resourceId: treeFort.id })
  await lk.resources.delete({ resourceId: finn.id })
  await lk.resources.delete({ resourceId: jake.id })
  await lk.assets.delete({ assetId: portrait.id })
}
