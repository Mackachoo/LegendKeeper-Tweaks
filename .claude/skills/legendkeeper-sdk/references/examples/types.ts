import { LegendKeeper, type Operation, type Options, type Result, type components } from '@legendkeeper/sdk'
import { BlockKind, h, p, plainText, type Block, type HeadingBlock } from '@legendkeeper/sdk/blocks'

type Resource = components['schemas']['Resource']
type CreateResource = Extract<Operation, { id: 'createResource' }>
type CreateResourceOptions = Options<CreateResource>
type CreatedResource = Result<CreateResource>

function headings(blocks: readonly Block[]): string[] {
  return blocks.filter((block): block is HeadingBlock => block.kind === BlockKind.heading).map((block) => plainText(block))
}

function summary(resource: Resource): string {
  return `${resource.name}: ${resource.documents.length} documents, tags ${resource.tags.join(', ')}`
}

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const options: CreateResourceOptions = { name: 'Ice Kingdom', tags: ['Kingdom'] }
const created: CreatedResource = await lk.resources.create(options)
try {
  const page = created.documents[0]!
  const written = await lk.documents.replaceBlocks(
    { resourceId: created.id, documentId: page.id },
    { blocks: [h(1, 'Ice Kingdom'), p('Cold. Full of penguins.'), h(2, 'Residents'), p('The Ice King, and Gunter, who is the dangerous one.')] },
  )
  console.log(headings(written.blocks))
  console.log(summary(await lk.resources.get({ resourceId: created.id })))
} finally {
  await lk.resources.delete({ resourceId: created.id })
}
