import { LegendKeeper, type Page, type components } from '@legendkeeper/sdk'

type ResourceListItem = components['schemas']['ResourceListItem']

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
const kingdoms: string[] = []
try {
  for (const name of ['Candy Kingdom', 'Ice Kingdom', 'Fire Kingdom', 'Lumpy Space', 'Wildberry Kingdom']) {
    kingdoms.push((await lk.resources.create({ name, parentId: ooo.id })).id)
  }

  for await (const kingdom of await lk.resources.list({ parentId: ooo.id, limit: 2 })) {
    console.log(kingdom.name)
  }

  for await (const member of await lk.members.list()) {
    console.log(member.id, member.role)
  }

  let page: Page<ResourceListItem> | null = await lk.resources.list({ parentId: ooo.id, limit: 2 })
  while (page !== null) {
    console.log(page.data.map((kingdom) => kingdom.name).join(', '), page.hasMore ? 'then more' : 'and no more')
    page = await page.next()
  }

  const documents = await lk.documents.list({ resourceId: ooo.id })
  console.log(`${documents.data.length} documents, hasMore ${documents.hasMore}, nextCursor ${documents.nextCursor}`)
} finally {
  for (const id of kingdoms) await lk.resources.delete({ resourceId: id })
  await lk.resources.delete({ resourceId: ooo.id })
}
