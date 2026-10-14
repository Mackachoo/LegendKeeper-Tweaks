import { deflateSync } from 'node:zlib'
import { LegendKeeper, pixelToPos } from '@legendkeeper/sdk'
import { callout, h, keyValue, mention, p, plainText, property, ul } from '@legendkeeper/sdk/blocks'

type Rgb = [number, number, number]
type Kingdom = { name: string; ruler: string; summary: string; landmarks: [string, ...string[]]; pixel: [number, number]; color: Rgb }

const kingdoms: Kingdom[] = [
  { name: 'Candy Kingdom', ruler: 'Princess Bubblegum', summary: 'Candy people, a castle, and a princess who runs it like a lab.', landmarks: ['Candy Castle', 'Candy Village'], pixel: [520, 420], color: [255, 160, 200] },
  { name: 'Ice Kingdom', ruler: 'The Ice King', summary: 'A lonely king, a mountain of ice and far too many penguins.', landmarks: ['Ice Castle', 'The fan fiction shelf'], pixel: [220, 170], color: [220, 240, 255] },
  { name: 'Fire Kingdom', ruler: 'Flame Princess', summary: 'Hot enough that Finn needed a fire shield to visit.', landmarks: ['Fire Palace'], pixel: [830, 610], color: [255, 110, 40] },
]
const treeFort: [number, number] = [400, 520]
const grass: Rgb = [120, 200, 90]

const kingdomAt = (x: number, y: number) => kingdoms.find(({ pixel }) => Math.hypot(x - pixel[0], y - pixel[1]) < 110)

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo', tags: ['World'] })
const art = await lk.assets.uploadImage({ data: png(1024, 768, (x, y) => kingdomAt(x, y)?.color ?? grass), contentType: 'image/png', name: 'Map of Ooo' })
const created: { id: string; name: string; pixel: [number, number] }[] = []
try {
  for (const kingdom of kingdoms) {
    const resource = await lk.resources.create({ name: kingdom.name, parentId: ooo.id, tags: ['Kingdom'] })
    created.push({ id: resource.id, name: resource.name, pixel: kingdom.pixel })
    await lk.properties.create({ resourceId: resource.id }, property(keyValue([['Ruler', kingdom.ruler]]), { title: 'Rule' }))
    const page = resource.documents[0]!
    const written = await lk.documents.replaceBlocks(
      { resourceId: resource.id, documentId: page.id },
      { blocks: [h(2, kingdom.name), p(kingdom.summary, ' Part of ', mention({ resourceId: ooo.id }), '.'), ul(...kingdom.landmarks)] },
    )
    console.log(plainText(written))
  }

  const overview = ooo.documents[0]!
  await lk.documents.replaceBlocks(
    { resourceId: ooo.id, documentId: overview.id },
    {
      blocks: [
        h(2, 'Kingdoms'),
        ...created.map((kingdom) => p(mention({ resourceId: kingdom.id }))),
        callout('note', ['Everything here grew back after the Mushroom War.']),
      ],
    },
  )

  const mapDocument = await lk.documents.create({ resourceId: ooo.id }, { name: 'Map of Ooo', type: 'map' })
  const map = { resourceId: ooo.id, documentId: mapDocument.id }
  const { mapImage } = await lk.documents.update(map, { mapImage: { assetId: art.id } })
  if (!mapImage) throw new Error('the map has an image')
  const folder = await lk.features.create(map, { type: 'folder', name: 'Kingdoms' })
  for (const kingdom of created) {
    const pos = pixelToPos(mapImage, ...kingdom.pixel)
    await lk.features.create(map, { type: 'pin', name: kingdom.name, pos, parentId: folder.id, uri: `lk://resources/${kingdom.id}` })
  }
  await lk.features.create(map, { type: 'pin', name: 'The Tree Fort', pos: pixelToPos(mapImage, ...treeFort), iconGlyph: 'tree' })

  const timelineDocument = await lk.documents.create({ resourceId: ooo.id }, { name: 'History of Ooo', type: 'time' })
  const timeline = { resourceId: ooo.id, documentId: timelineDocument.id }
  const before = await lk.timelines.createLane(timeline, { name: 'Before Finn', rank: 'a0', size: 'lg' })
  const after = await lk.timelines.createLane(timeline, { name: 'Finn and Jake', rank: 'a1', size: 'lg' })
  const events = [
    { laneId: before.id, name: 'The Great Mushroom War', formattedStart: '2000' },
    { laneId: before.id, name: 'Simon finds a lost little girl named Marceline', formattedStart: '2001' },
    { laneId: before.id, name: 'The crown wins; Simon is the Ice King', formattedStart: '2010' },
    { laneId: after.id, name: 'Finn and Jake find the Enchiridion', formattedStart: '3012' },
  ]
  for (const event of events) await lk.timelines.createEvent(timeline, { ...event, type: 'event' })

  for await (const event of await lk.timelines.listEvents(timeline)) console.log(event.formattedStart, event.name)
  console.log((await lk.features.list(map, { type: 'pin' })).data.map((pin) => pin.name).join(', '))
} finally {
  for (const kingdom of created) await lk.resources.delete({ resourceId: kingdom.id })
  await lk.resources.delete({ resourceId: ooo.id })
  await lk.assets.delete({ assetId: art.id })
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const chunk = Buffer.alloc(body.length + 8)
  chunk.writeUInt32BE(data.length, 0)
  body.copy(chunk, 4)
  chunk.writeUInt32BE(crc32(body), body.length + 4)
  return chunk
}

function png(width: number, height: number, colorAt: (x: number, y: number) => Rgb): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const stride = width * 3 + 1
  const rows = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) rows.set(colorAt(x, y), y * stride + 1 + x * 3)
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', new Uint8Array())])
}
