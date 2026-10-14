import { deflateSync } from 'node:zlib'
import { LegendKeeper, ValidationError } from '@legendkeeper/sdk'
import { image } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const album = await lk.assets.createFolder({ name: 'BMO’s photo album' })
const bmo = await lk.resources.create({ name: 'BMO' })
try {
  const face = await lk.assets.uploadImage({ data: solidPng(32, [79, 187, 162]), contentType: 'image/png', name: 'BMO’s face', folderId: album.id })
  console.log(face.type, face.width, face.height, face.url)
  if (face.url === undefined) throw new Error('an uploaded image has a url')

  const gum = solidPng(16, [255, 105, 180])
  const upload = await lk.assets.createImageUpload({ contentType: 'image/png', contentLength: gum.byteLength })
  const stored = await fetch(upload.uploadUrl, { method: upload.method, headers: upload.headers, body: gum })
  if (!stored.ok) throw new Error(`storage answered ${stored.status}`)
  const asset = await lk.assets.createImage({ uploadKey: upload.uploadKey, name: 'A piece of gum', folderId: album.id })
  console.log(asset.name, asset.width, asset.height)

  const page = bmo.documents[0]!
  const doc = { resourceId: bmo.id, documentId: page.id }
  await lk.documents.replaceBlocks(doc, { blocks: [image(face.url, 'BMO’s face')] })
  await lk.resources.update({ resourceId: bmo.id }, { banner: { enabled: true, url: face.url, yPosition: 50 } })

  try {
    await lk.documents.replaceBlocks(doc, { blocks: [image('data:image/png;base64,iVBORw0KGgo=', 'Pasted from the clipboard')] })
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    for (const issue of error.errors ?? []) console.log(`${error.code} at ${issue.path}`)
  }
} finally {
  await lk.resources.delete({ resourceId: bmo.id })
  await lk.assets.delete({ assetId: album.id })
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

function solidPng(size: number, rgb: [number, number, number]): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const row = [0, ...Array.from({ length: size }, () => rgb).flat()]
  const pixels = deflateSync(Buffer.from(Array.from({ length: size }, () => row).flat()))
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([signature, pngChunk('IHDR', header), pngChunk('IDAT', pixels), pngChunk('IEND', new Uint8Array())])
}
