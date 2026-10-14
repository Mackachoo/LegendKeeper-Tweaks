import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const kingdom = await lk.resources.create({
  name: 'Kingdom',
  tags: ['Kingdom'],
  documents: [{ blocks: [{ kind: 'paragraph', content: [{ text: 'Ruler, capital, allies.' }] }] }],
})
try {
  await lk.resources.create({ name: 'Castle', parentId: kingdom.id })

  const template = await lk.resources.saveAsTemplate({ resourceId: kingdom.id }, { name: 'Kingdom Template', includeChildren: true })
  try {
    for await (const listed of await lk.templates.list()) console.log('template:', listed.name)

    const realm = await lk.resources.createFromTemplate({ templateId: template.id, name: 'Realm', includeChildren: true })
    try {
      const page = await lk.documents.getBlocks({ resourceId: realm.id, documentId: realm.documents[0]!.id })
      console.log(realm.name, realm.tags, page.text)
      for await (const child of await lk.resources.list({ parentId: realm.id })) console.log('child:', child.name)
    } finally {
      await lk.resources.delete({ resourceId: realm.id }, { cascade: true })
    }
  } finally {
    await lk.resources.delete({ resourceId: template.id }, { cascade: true })
  }
} finally {
  await lk.resources.delete({ resourceId: kingdom.id }, { cascade: true })
}
