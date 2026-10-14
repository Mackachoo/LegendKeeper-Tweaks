import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const treasure = await lk.assets.createFolder({ name: 'Tree Fort treasure' })
try {
  const scans = await lk.assets.createFolder({ name: 'Enchiridion', folderId: treasure.id })

  await lk.assets.update({ assetId: scans.id }, { name: 'Enchiridion scans', description: 'Pages from the book of heroes, for the players' })
  const renamed = await lk.assets.get({ assetId: scans.id })
  console.log(renamed.name, renamed.type, renamed.folderId === treasure.id, renamed.description)

  for await (const asset of await lk.assets.list({ folderId: treasure.id })) console.log('in the treasure folder:', asset.name)

  await lk.assets.update({ assetId: scans.id }, { folderId: null })
  const root = await lk.assets.list({ limit: 100 })
  console.log(root.data.some((asset) => asset.id === scans.id))
  await lk.assets.delete({ assetId: scans.id })
} finally {
  await lk.assets.delete({ assetId: treasure.id })
}
