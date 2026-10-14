import assert from 'node:assert/strict'
import { h, p, bold, italic, mention, infobox, property, keyValue, collection, callout, secret, expand, ul, li, ol, tasks, task, table, tr, th, td, code, quote, rule, image, link, mono, underline, sup, br, withId } from '@legendkeeper/sdk/blocks'
import { blocksToMarkdown, markdownToBlocks } from '../src/markdown.js'
import { validate } from './schema.js'

export const tests: [string, () => void | Promise<void>][] = []
const test = (name: string, fn: () => void | Promise<void>) => tests.push([name, fn])

const valid = (blocks: unknown) => {
  const errors = validate('DocumentBlocksWrite', { blocks })
  assert.deepEqual(errors, [], JSON.stringify(blocks, null, 1))
}

test('rich Markdown parses into schema-valid blocks', () => {
  const md = `# The Candy Kingdom

Ruled by **Princess *Bubblegum***, ~~badly~~ guarded by the [Banana Guards](https://example.com) and [[Peppermint Butler]].
H<sub>2</sub>O and <u>underlined</u> and \`code\`.

- Candy Castle
  - Throne room
- Candy Village

3. third
4. fourth

- [x] Rebuild the castle
- [ ] Warn the people

> [!warning] Lemongrab
> Do not let him in. **UNACCEPTABLE.**

> [!secret]
> Peppermint Butler knows dark magic.

> [!expand] History
> Grown from the Mother Gum.

> Just a quote.

| Kingdom | Ruler |
| --- | --- |
| Ice | [The Ice King](lk://resources/rice00001) |

\`\`\`bash
bubblegum --analyze
\`\`\`

---

![The flag](https://www.legendkeeper.com/assets/flag.png)

line one\\
line two`
  const { blocks, warnings } = markdownToBlocks(md, { resolve: (n) => (n === 'Peppermint Butler' ? 'rpep00001' : undefined) })
  assert.deepEqual(warnings, [])
  valid(blocks)
  const kinds = blocks.map((b) => b.kind)
  assert.deepEqual(kinds, ['heading', 'paragraph', 'bulletList', 'orderedList', 'taskList', 'callout', 'secret', 'expand', 'quote', 'table', 'code', 'rule', 'image', 'paragraph'])
  const intro = blocks[1] as any
  assert.ok(intro.content.some((r: any) => r.mention?.resourceId === 'rpep00001'))
  assert.ok(intro.content.some((r: any) => r.bold && r.italic && r.text === 'Bubblegum'))
  assert.equal((blocks[3] as any).start, 3)
  assert.equal((blocks[5] as any).tone, 'warning')
  assert.equal((blocks[7] as any).title, 'History')
  assert.equal((blocks[9] as any).children[1].children[1].children[0].content[0].mention.resourceId, 'rice00001')
})

test('pages render to Markdown and back without losing content', () => {
  const page = [
    withId('b1', h(1, 'Candy Kingdom')),
    withId('b2', p('Ruled by ', mention({ resourceId: 'rpb000001', text: 'Princess Bubblegum' }), ', ', bold(italic('mostly science')), '. ', link('https://x.y', 'Guards'), ' ', mono('I am a banana'), br, underline('U'), sup('2'))),
    withId('b3', ul('Candy Castle', li('Candy Village', ol(['Cinnamon Bun', 'Hospital'])))),
    withId('b4', tasks(task(true, 'Rebuild'), task(false, 'Warn'))),
    withId('b5', table(tr(th(['Kingdom']), th(['Ruler'])), tr(td(['Ice']), td(['Ice King'])))),
    withId('b6', callout('note', ['The Banana Guards guard the castle.'])),
    withId('b7', secret('Peppermint Butler knows dark magic.')),
    withId('b8', expand('Origins', 'Grown from gum.')),
    withId('b9', quote('A quote * with stars and [brackets].')),
    withId('b10', code('x = 1', 'python')),
    withId('b11', rule()),
  ]
  const md = blocksToMarkdown(page, { ids: true })
  const { blocks, warnings } = markdownToBlocks(md, { existing: page })
  assert.deepEqual(warnings, [])
  valid(blocks)
  const strip = (x: unknown): unknown => JSON.parse(JSON.stringify(x, (k, v) => (k === 'id' && typeof v === 'string' && !v.startsWith('b') ? undefined : v)))
  assert.deepEqual(strip(blocks), strip(page))
})

test('rich blocks survive as placeholders and come back by id', () => {
  const page = [
    withId('ibx', infobox(property(keyValue([['Age', '827'], ['Title', 'Princess']]), { title: 'Facts' }))),
    withId('p1', p('Intro.')),
    withId('col', collection({ items: ['r1', 'r2'], isTitleHidden: true })),
  ]
  const md = blocksToMarkdown(page)
  assert.match(md, /<!-- lk:keep id=ibx kind=infobox \| Facts: Age=827, Title=Princess -->/)
  const edited = md.replace('Intro.', 'A new intro with **bold**.')
  const { blocks, keptIds, warnings } = markdownToBlocks(edited, { existing: page })
  assert.deepEqual(warnings, [])
  assert.deepEqual(keptIds, ['ibx', 'col'])
  assert.equal(blocks[0], page[0])
  assert.equal(blocks[2], page[2])
  valid(blocks)
})

test('unknown names, ids and placeholders produce warnings, not errors', () => {
  const { blocks, warnings } = markdownToBlocks('See [[Nobody]].\n\n<!-- lk:keep id=gone kind=infobox -->\n\n<!-- lk:id=nope -->\nText', { existing: [] })
  assert.equal(warnings.length, 3)
  valid(blocks)
})

test('awkward text escapes and round-trips', () => {
  const page = [p('5 * 3 = 15, use _underscores_ and <tags> and [x] # not a heading'), p('# literal hash'), p('1. not a list')]
  const md = blocksToMarkdown(page)
  const { blocks } = markdownToBlocks(md)
  assert.deepEqual(blocks.map((b: any) => b.content.map((r: any) => r.text).join('')), page.map((b: any) => b.content.map((r: any) => r.text).join('')))
})

test('empty and whitespace-only Markdown is valid', () => {
  valid(markdownToBlocks('').blocks)
  valid(markdownToBlocks('\n\n  \n').blocks)
})
