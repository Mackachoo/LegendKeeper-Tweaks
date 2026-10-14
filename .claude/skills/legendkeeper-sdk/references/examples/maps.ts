import { LegendKeeper, ValidationError } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
const fort = await lk.resources.create({ name: 'The Tree Fort' })
try {
  const map = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }

  const homes = await lk.features.create(map, { type: 'folder', name: 'Homes' })
  const pin = await lk.features.create(map, {
    type: 'pin',
    name: 'The Tree Fort',
    pos: [12.5, -40.25],
    parentId: homes.id,
    uri: `lk://resources/${fort.id}`,
    iconShape: 'none',
  })
  const ice = await lk.features.create(map, {
    type: 'region',
    name: 'Ice Kingdom',
    polygon: [[40, -60], [40, -20], [30, -20], [30, -60]],
    color: '#a8d8ff',
    fillOpacity: 0.3,
  })

  await lk.features.update({ ...map, featureId: pin.id }, { pos: [12.75, -40.5], iconGlyph: 'tree' })
  const moved = await lk.features.get({ ...map, featureId: pin.id })
  console.log(moved.name, moved.pos, moved.parentId === homes.id, moved.uri, moved.iconShape)

  const [fortPage] = fort.documents
  if (!fortPage) throw new Error('a new resource has one document')
  await lk.features.update({ ...map, featureId: ice.id }, { uri: `lk://documents/${fortPage.id}` })
  try {
    await lk.features.update({ ...map, featureId: ice.id }, { uri: 'https://example.com/ice-kingdom' })
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    for (const issue of error.errors ?? []) console.log(`${error.code} at ${issue.path}`)
  }
  console.log((await lk.features.get({ ...map, featureId: ice.id })).uri)
  await lk.features.update({ ...map, featureId: ice.id }, { uri: '' })

  for (const feature of (await lk.features.list(map)).data) console.log(feature.type, feature.name)
  console.log((await lk.features.list(map, { type: 'pin' })).data.length, 'pins')

  await lk.features.delete({ ...map, featureId: ice.id })
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
  await lk.resources.delete({ resourceId: fort.id })
}
