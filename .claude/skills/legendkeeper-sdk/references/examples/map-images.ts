import { deflateSync } from 'node:zlib'
import { LegendKeeper, pixelToPos, posToPixel } from '@legendkeeper/sdk'

type Rgb = [number, number, number]

const kingdoms: { name: string; pixel: [number, number]; color: Rgb }[] = [
  { name: 'Candy Kingdom', pixel: [520, 420], color: [255, 160, 200] },
  { name: 'Ice Kingdom', pixel: [220, 170], color: [220, 240, 255] },
  { name: 'Fire Kingdom', pixel: [830, 610], color: [255, 110, 40] },
]
const grass: Rgb = [120, 200, 90]
const kingdomAt = (x: number, y: number) => kingdoms.find(({ pixel }) => Math.hypot(x - pixel[0], y - pixel[1]) < 110)

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
const art = await lk.assets.uploadImage({
  data: png(1024, 768, (x, y) => kingdomAt(x, y)?.color ?? grass),
  contentType: 'image/png',
  name: 'Map of Ooo',
})
try {
  const map = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }

  const updated = await lk.documents.update(map, { mapImage: { assetId: art.id } })
  const image = updated.mapImage
  if (!image) throw new Error('the map has an image')
  console.log(image.width, image.height, JSON.stringify(image.bounds), image.assetId === art.id)

  for (const kingdom of kingdoms) {
    const [x, y] = kingdom.pixel
    await lk.features.create(map, { type: 'pin', name: kingdom.name, pos: pixelToPos(image, x, y) })
  }

  for (const pin of (await lk.features.list(map, { type: 'pin' })).data) {
    if (!pin.pos) continue
    console.log(pin.name, JSON.stringify(pin.pos), JSON.stringify(posToPixel(image, pin.pos)))
  }
} finally {
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
