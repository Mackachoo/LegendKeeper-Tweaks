import { LegendKeeper, VersionMismatchError } from '@legendkeeper/sdk'
import { p } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const lsp = await lk.resources.create({ name: 'Lumpy Space Princess' })
try {
  const page = lsp.documents[0]!
  const doc = { resourceId: lsp.id, documentId: page.id }

  const read = await lk.documents.getBlocks(doc)
  const written = await lk.documents.replaceBlocks(doc, { blocks: [p('Lives in Lumpy Space. Oh my glob.')], ifMatch: read.version })
  console.log(`read at ${read.version}, written at ${written.version}`)

  try {
    await lk.documents.replaceBlocks(doc, { blocks: [p('Lives in the woods now. Whatever.')], ifMatch: read.version })
  } catch (error) {
    if (!(error instanceof VersionMismatchError)) throw error
    console.log(`rejected; the document is at ${error.currentVersion}`)
    const fresh = await lk.documents.getBlocks(doc)
    const merged = await lk.documents.replaceBlocks(doc, {
      blocks: [...fresh.blocks, p('Moved to the woods after a fight with her parents.')],
      ifMatch: fresh.version,
    })
    console.log(`${merged.blocks.length} blocks at ${merged.version}`)
  }
} finally {
  await lk.resources.delete({ resourceId: lsp.id })
}
