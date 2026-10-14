import { LegendKeeper } from '@legendkeeper/sdk'
import {
  bold, br, callout, code, collection, column, expand, findBlock, h, image, infobox, italic, keyValue, layout, li, link,
  links, mention, meter, mono, ol, p, plainText, property, quote, rule, secret, table, task, tasks, td, th, tr, ul, walk,
} from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const flagPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const flag = await lk.assets.uploadImage({ data: flagPng, contentType: 'image/png', name: 'The Candy Kingdom flag' })
const kingdom = await lk.resources.create({ name: 'Candy Kingdom' })
const pb = await lk.resources.create({ name: 'Princess Bubblegum' })
try {
  const page = kingdom.documents[0]!
  const doc = { resourceId: kingdom.id, documentId: page.id }

  const written = await lk.documents.replaceBlocks(doc, {
    blocks: [
      infobox(
        [
          property(image(flag.url!, { alt: 'The Candy Kingdom flag', fill: true }), { title: 'Flag', isTitleHidden: true }),
          property(keyValue([['Citizens', 'Candy People'], ['Founded', 'After the Mushroom War']]), { title: 'Facts' }),
          property(links([pb.id]), { title: 'Ruler' }),
        ],
        { layout: 'wrapRight', width: 40 },
      ),
      h(1, 'Candy Kingdom'),
      p('A kingdom of candy people, ruled by ', mention({ resourceId: pb.id }), ', who is mostly science.'),
      p('Guarded ', italic('badly'), ' by ', link('https://example.com/banana-guards', 'the Banana Guards'), '.', br, 'Their password: ', mono('I am a banana')),
      callout('warning', ['Do not let the Earl of Lemongrab in. UNACCEPTABLE.']),
      h(2, 'Rulers'),
      collection({ items: [pb.id], isTitleHidden: true }),
      h(2, 'Landmarks'),
      ul('Candy Castle', li('Candy Village', ol(['Cinnamon Bun’s house', 'The Candy Kingdom Hospital']))),
      tasks(task(true, 'Rebuild the castle after the Lich'), task(false, 'Tell the Candy People about the Lich')),
      table(tr(th(['Kingdom']), th(['Ruler'])), tr(td(['Ice Kingdom']), td(['The Ice King'])), tr(td(['Fire Kingdom']), td(['Flame Princess']))),
      layout(column(50, 'Exports: candy, science.'), column(50, 'Imports: nothing. She makes it.')),
      expand('Where she came from', quote('A Candy Elemental, grown from the Mother Gum after the Mushroom War.')),
      meter('bar', [{ name: 'Sugar reserves', icon: 'candy-cane', current: 6, max: 10, color: '#ff69b4' }]),
      secret('Peppermint Butler knows dark magic.'),
      code('bubblegum --analyze candy-person', 'bash'),
      rule(),
    ],
  })

  console.log(`${written.blocks.length} top-level blocks at version ${written.version}`)
  console.log(plainText(written) === written.text)
  walk(written, (block, path) => console.log(path, block.kind))
  const introId = written.blocks[2]?.id
  if (!introId) throw new Error('the intro paragraph has an id')
  console.log(findBlock(written, introId)?.kind)
} finally {
  await lk.resources.delete({ resourceId: kingdom.id })
  await lk.resources.delete({ resourceId: pb.id })
  await lk.assets.delete({ assetId: flag.id })
}
