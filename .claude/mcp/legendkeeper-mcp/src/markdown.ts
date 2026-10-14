/**
 * Markdown <-> LegendKeeper block conversion.
 *
 * Reading: blocksToMarkdown renders a page as GitHub-flavoured Markdown. Blocks Markdown
 * cannot express (infoboxes, collections, meters, layouts, ...) become placeholder comments:
 *   <!-- lk:keep id=<blockId> kind=<kind> | <short summary> -->
 *
 * Writing: markdownToBlocks parses Markdown back into blocks. A placeholder line keeps the
 * original block (looked up by id in the current page) at that position, so a page can be
 * read, edited as Markdown and written back without losing rich content. An id comment
 *   <!-- lk:id=<blockId> -->
 * before a Markdown block makes the new block keep that id.
 *
 * Dialect (beyond GFM): [label](lk://resources/<id>) and [[Exact Name]] / [[Exact Name|label]]
 * are mentions; > [!note|info|success|warning|error] is a callout; > [!secret] is GM-only
 * content; > [!expand] Title is a collapsible section; <u>, <sub>, <sup> are marks;
 * - [ ] / - [x] are checklists.
 */
import { marked, type Token, type Tokens } from 'marked'
import type { Block, PropertyBlock, Run } from '@legendkeeper/sdk/blocks'

type AnyBlock = Block | PropertyBlock
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type TextRunT = Extract<Run, { text: string }>
type Marks = Omit<TextRunT, 'text'>

/** Resolves [[Name]] wiki links to a resource id. Return undefined when no single match. */
export type NameResolver = (name: string) => string | undefined

export interface ParseResult {
  blocks: Block[]
  warnings: string[]
  keptIds: string[]
}

const RICH_KINDS = new Set([
  'infobox', 'keyValue', 'resourceCollection', 'resourceLink', 'meter', 'map', 'embed',
  'layout', 'layoutColumn', 'textField', 'unsupported',
])

const CALLOUT_ALIASES: Record<string, string> = {
  note: 'note', info: 'info', success: 'success', warning: 'warning', error: 'error',
  tip: 'success', hint: 'success', check: 'success', done: 'success',
  important: 'info', abstract: 'info', summary: 'info', question: 'info', example: 'info', quote: 'note',
  caution: 'warning', attention: 'warning', danger: 'error', bug: 'error', failure: 'error', fail: 'error',
}

// ---------------------------------------------------------------- reading

const escapeText = (s: string) =>
  s
    .replace(/([\\`*_[\]<>~])/g, '\\$1')
    .replace(/^(\s*)([#>+-])(\s)/, '$1\\$2$3')
    .replace(/^(\s*\d+)([.)])(\s)/, '$1\\$2$3')

function renderRuns(runs: readonly Run[] | undefined, inTable = false): string {
  if (!runs) return ''
  let out = ''
  for (const run of runs) {
    if ('break' in run) {
      out += inTable ? '<br>' : '\\\n'
      continue
    }
    if ('mention' in run) {
      const m = run.mention
      const label = m.text || m.name || m.resourceId
      const target = m.documentId ? `lk://resources/${m.resourceId}/docs/${m.documentId}` : `lk://resources/${m.resourceId}`
      out += `[${escapeText(label)}](${target})`
      continue
    }
    const r = run as TextRunT
    let s: string
    if (r.code) {
      const ticks = r.text.includes('`') ? '``' : '`'
      s = `${ticks}${ticks === '``' ? ' ' : ''}${r.text}${ticks === '``' ? ' ' : ''}${ticks}`
    } else {
      // Keep surrounding whitespace outside the markers so ** text ** stays valid.
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.text)!
      let core = escapeText(m[2]!)
      if (inTable) core = core.replace(/\|/g, '\\|').replace(/\n/g, ' ')
      if (core) {
        if (r.sub) core = `<sub>${core}</sub>`
        if (r.sup) core = `<sup>${core}</sup>`
        if (r.underline) core = `<u>${core}</u>`
        if (r.strike) core = `~~${core}~~`
        if (r.italic) core = `*${core}*`
        if (r.bold) core = `**${core}**`
      }
      s = m[1] + core + m[3]
    }
    if (r.link) s = `[${s}](${r.link})`
    out += s
  }
  return out
}

const indent = (text: string, prefix: string) =>
  text.split('\n').map((line, i) => (i === 0 ? line : line ? prefix + line : line)).join('\n')

const quoteLines = (text: string) =>
  text.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')

function oneLine(s: string, max = 160) {
  const flat = s.replace(/\s+/g, ' ').replace(/--+>/g, '->').trim()
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat
}

function plain(runs: readonly Run[] | undefined): string {
  return (runs ?? []).map((r) => ('break' in r ? ' ' : 'mention' in r ? r.mention.text || r.mention.name || r.mention.resourceId : r.text)).join('')
}

function blocksPlain(blocks: readonly AnyBlock[] | undefined): string {
  const parts: string[] = []
  const visit = (b: AnyBlock) => {
    const anyB = b as unknown as Record<string, unknown>
    if (Array.isArray(anyB.content)) parts.push(plain(anyB.content as Run[]))
    if (typeof anyB.text === 'string' && anyB.kind === 'code') parts.push(anyB.text)
    for (const c of (anyB.children as AnyBlock[] | undefined) ?? []) visit(c)
  }
  for (const b of blocks ?? []) visit(b)
  return parts.filter(Boolean).join(' ')
}

/** A short, human-readable description of a rich block, used inside its placeholder. */
export function summarize(block: AnyBlock, showTitle = true): string {
  const b = block as unknown as Record<string, any>
  const title = showTitle && b.title && !b.isTitleHidden ? `"${b.title}" ` : ''
  switch (b.kind) {
    case 'infobox':
      return (b.rows as AnyBlock[]).map((row) => `${(row as any).title ?? row.kind}: ${summarize(row, false)}`).join('; ')
    case 'keyValue':
      return title + (b.rows ?? []).map((r: any) => `${r.key}=${r.text ?? plain(r.content)}`).join(', ')
    case 'resourceCollection':
      return title + (b.filter ? `filter ${JSON.stringify(b.filter)}` : `items ${(b.items ?? []).map((i: any) => i.resourceId).join(',')}`)
    case 'resourceLink':
      return title + 'links to ' + (b.items ?? []).map((i: any) => i.resourceId).join(',')
    case 'meter':
      return title + (b.items ?? []).map((i: any) => `${i.name} ${i.current}/${i.max}`).join(', ')
    case 'map':
      return title + (b.resourceId ? `map of resource ${b.resourceId} doc ${b.documentId}` : 'unlinked map')
    case 'embed':
      return title + `${b.provider} ${b.url}`
    case 'image':
      return title + `image ${b.url}${b.alt ? ` (${b.alt})` : ''}`
    case 'textField':
    case 'layout':
    case 'layoutColumn':
    case 'secret':
    case 'callout':
    case 'table':
      return title + blocksPlain(b.children)
    case 'unsupported':
      return 'content the API cannot show'
    default:
      return blocksPlain([block])
  }
}

function placeholder(block: AnyBlock): string {
  return `<!-- lk:keep id=${block.id ?? '?'} kind=${block.kind} | ${oneLine(summarize(block))} -->`
}

function isSimpleTable(block: Extract<Block, { kind: 'table' }>): boolean {
  const rows = block.children as AnyBlock[]
  if (!rows.length) return false
  const width = (rows[0] as any).children.length
  return rows.every((row: any, i: number) =>
    row.children.length === width &&
    row.children.every((cell: any) =>
      !cell.colspan && !cell.rowspan && Boolean(cell.header) === (i === 0) &&
      cell.children.length <= 1 && cell.children.every((c: AnyBlock) => c.kind === 'paragraph')))
}

function isMarkdownable(block: AnyBlock): boolean {
  const b = block as any
  if (RICH_KINDS.has(b.kind)) return false
  if (b.kind === 'image') return !b.fill && !b.title && (!b.layout || b.layout === 'default')
  if (b.kind === 'callout') return b.tone !== 'custom'
  if (b.kind === 'secret') return !b.layout || b.layout === 'default'
  if (b.kind === 'table') return isSimpleTable(b)
  return true
}

function renderBlock(block: AnyBlock, ids: boolean, depth: number): string {
  const b = block as any
  if (!isMarkdownable(block)) return placeholder(block)
  const idLine = ids && depth === 0 && b.id ? `<!-- lk:id=${b.id} -->\n` : ''
  return idLine + renderBody(block, ids, depth)
}

function renderChildren(children: readonly AnyBlock[], ids: boolean, depth: number) {
  return children.map((c) => renderBlock(c, ids, depth + 1)).join('\n\n')
}

function renderList(b: any, ids: boolean, depth: number): string {
  let n = b.start ?? 1
  return (b.children as any[]).map((item) => {
    const marker = b.kind === 'orderedList' ? `${n++}. ` : '- '
    if (item.kind !== 'listItem') return marker + renderBlock(item, ids, depth + 1)
    const [first, ...rest] = item.children as AnyBlock[]
    const head = first?.kind === 'paragraph' ? renderRuns((first as any).content) : first ? renderBlock(first, ids, depth + 1) : ''
    const tail = rest.map((c) => renderBlock(c, ids, depth + 1)).join('\n')
    return indent(marker + head + (tail ? '\n' + tail : ''), ' '.repeat(marker.length))
  }).join('\n')
}

function renderTasks(b: any, ids: boolean, depth: number): string {
  return (b.children as any[]).map((item) =>
    item.kind === 'taskItem'
      ? `- [${item.checked ? 'x' : ' '}] ${renderRuns(item.content)}`
      : indent('  ' + renderTasks(item, ids, depth + 1), '  ')).join('\n')
}

function renderBody(block: AnyBlock, ids: boolean, depth: number): string {
  const b = block as any
  switch (b.kind) {
    case 'paragraph':
      return renderRuns(b.content)
    case 'heading':
      return `${'#'.repeat(b.level)} ${renderRuns(b.content)}`
    case 'quote':
      return quoteLines(renderChildren(b.children, ids, depth))
    case 'code': {
      const fence = b.text.includes('```') ? '````' : '```'
      return `${fence}${b.language ?? ''}\n${b.text}\n${fence}`
    }
    case 'rule':
      return '---'
    case 'bulletList':
    case 'orderedList':
      return renderList(b, ids, depth)
    case 'taskList':
      return renderTasks(b, ids, depth)
    case 'table': {
      const rows = (b.children as any[]).map((row) =>
        '| ' + row.children.map((cell: any) => renderRuns(cell.children[0]?.content, true) || ' ').join(' | ') + ' |')
      const width = b.children[0].children.length
      rows.splice(1, 0, '|' + ' --- |'.repeat(width))
      return rows.join('\n')
    }
    case 'callout':
      return quoteLines(`[!${b.tone}]\n${renderChildren(b.children, ids, depth)}`)
    case 'secret':
      return quoteLines(`[!secret]\n${renderChildren(b.children, ids, depth)}`)
    case 'expand':
      return quoteLines(`[!expand] ${b.title}\n${renderChildren(b.children, ids, depth)}`)
    case 'image':
      return `![${escapeText(b.alt ?? '')}](${b.url})`
    default:
      return placeholder(block)
  }
}

/** Render a page's blocks as Markdown. With ids, each top-level Markdown block is preceded by its id comment. */
export function blocksToMarkdown(blocks: readonly Block[], options: { ids?: boolean } = {}): string {
  return blocks.map((b) => renderBlock(b, options.ids ?? false, 0)).join('\n\n')
}

/** Render a sidebar/infobox property for display. */
export function propertyToText(prop: PropertyBlock): string {
  const p = prop as any
  const label = p.title ?? p.kind
  const hidden = p.isHidden ? ' (hidden from players)' : ''
  switch (p.kind) {
    case 'keyValue':
      return `${label}${hidden}:\n` + (p.rows ?? []).map((r: any) => `  - ${r.key}: ${r.text ?? plain(r.content)}`).join('\n')
    case 'textField':
      return `${label}${hidden}:\n` + indent('  ' + blocksToMarkdown(p.children ?? []), '  ')
    default:
      return `${label}${hidden}: ${summarize(prop)}`
  }
}

// ---------------------------------------------------------------- writing

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: '\u00a0' }
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e]!)

/** Merge adjacent text runs with identical marks and drop empty ones, as the server does. */
function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = []
  const key = (r: TextRunT) => JSON.stringify({ ...r, text: undefined })
  for (const run of runs) {
    if ('text' in run) {
      if (!run.text) continue
      const prev = out[out.length - 1]
      if (prev && 'text' in prev && key(prev) === key(run)) {
        out[out.length - 1] = { ...prev, text: prev.text + run.text }
        continue
      }
    }
    out.push(run)
  }
  return out
}

const LK_LINK =/^lk:\/\/resources\/([^/?#]+)(?:\/docs\/([^/?#]+))?$/
const LK_DOC_LINK = /^lk:\/\/documents\/([^/?#]+)$/

class Parser {
  warnings: string[] = []
  keptIds: string[] = []
  constructor(private existing: Map<string, AnyBlock>, private resolve?: NameResolver) {}

  // ---- inline
  inline(tokens: Token[] | undefined, marks: Marks = {}, html: Marks = {}): Run[] {
    return mergeRuns(this.inlineRaw(tokens, marks, html))
  }

  inlineRaw(tokens: Token[] | undefined, marks: Marks = {}, html: Marks = {}): Run[] {
    const out: Run[] = []
    let open: Marks = { ...html }
    for (const t of tokens ?? []) {
      const m = { ...marks, ...open }
      switch (t.type) {
        case 'text':
        case 'escape': {
          const tt = t as Tokens.Text
          if ('tokens' in tt && tt.tokens?.length) out.push(...this.inline(tt.tokens, m))
          else out.push(...this.text(decode(tt.text), m))
          break
        }
        case 'strong':
          out.push(...this.inline((t as Tokens.Strong).tokens, { ...m, bold: true }))
          break
        case 'em':
          out.push(...this.inline((t as Tokens.Em).tokens, { ...m, italic: true }))
          break
        case 'del':
          out.push(...this.inline((t as Tokens.Del).tokens, { ...m, strike: true }))
          break
        case 'codespan':
          out.push({ text: decode((t as Tokens.Codespan).text), code: true, ...(m.link ? { link: m.link } : {}) })
          break
        case 'br':
          out.push({ break: true })
          break
        case 'link': {
          const l = t as Tokens.Link
          const res = LK_LINK.exec(l.href)
          const doc = LK_DOC_LINK.exec(l.href)
          if (res) {
            const label = plain(this.inline(l.tokens))
            out.push({ mention: { resourceId: res[1]!, ...(res[2] ? { documentId: res[2] } : {}), ...(label ? { text: label } : {}) } })
          } else if (doc) {
            this.warnings.push(`lk://documents/ links can't be mentions in text; kept "${l.text}" as plain text. Use lk://resources/<resourceId>/docs/<documentId>.`)
            out.push(...this.inline(l.tokens, m))
          } else {
            out.push(...this.inline(l.tokens, { ...m, link: l.href }))
          }
          break
        }
        case 'image': {
          const im = t as Tokens.Image
          this.warnings.push(`Inline image "${im.text}" was dropped: put images on their own line.`)
          break
        }
        case 'html': {
          const tag = (t as Tokens.HTML).text.trim().toLowerCase()
          const map: Record<string, keyof Marks> = { u: 'underline', ins: 'underline', sub: 'sub', sup: 'sup', b: 'bold', strong: 'bold', i: 'italic', em: 'italic', s: 'strike', del: 'strike' }
          const mt = /^<(\/?)(\w+)\s*\/?>$/.exec(tag)
          if (mt && mt[2] === 'br') out.push({ break: true })
          else if (mt && map[mt[2]!]) {
            const key = map[mt[2]!]!
            open = { ...open }
            if (mt[1]) delete (open as any)[key]
            else (open as any)[key] = true
          } else if (!tag.startsWith('<!--')) out.push(...this.text((t as Tokens.HTML).text, m))
          break
        }
        default:
          if ('text' in t && typeof t.text === 'string') out.push(...this.text(t.text, m))
      }
    }
    return out
  }

  /** Plain text with [[wiki links]] turned into mentions; soft line breaks become spaces. */
  text(s: string, marks: Marks): Run[] {
    const out: Run[] = []
    const re = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g
    let last = 0
    let m: RegExpExecArray | null
    const push = (txt: string) => {
      if (!txt) return
      const clean: Marks = { ...marks }
      if (clean.code) for (const k of ['bold', 'italic', 'underline', 'strike', 'sub', 'sup'] as const) delete clean[k]
      if (clean.sub && clean.sup) delete clean.sup
      out.push({ text: txt.replace(/\n/g, ' '), ...clean })
    }
    while ((m = re.exec(s))) {
      push(s.slice(last, m.index))
      const name = m[1]!.trim()
      const id = this.resolve?.(name)
      if (id) out.push({ mention: { resourceId: id, ...(m[2] ? { text: m[2].trim() } : {}) } })
      else {
        this.warnings.push(`[[${name}]] did not match exactly one resource; written as plain text.`)
        push(m[2]?.trim() || name)
      }
      last = m.index + m[0].length
    }
    push(s.slice(last))
    return out
  }

  // ---- blocks
  blocks(tokens: Token[], top = false): Block[] {
    const out: Block[] = []
    let pendingId: string | undefined
    for (const t of tokens) {
      if (t.type === 'space') continue
      if (t.type === 'html') {
        const text = (t as Tokens.HTML).text.trim()
        const keep = /^<!--\s*lk:keep\s+id=(\S+)/.exec(text)
        const idc = /^<!--\s*lk:id=(\S+?)\s*-->$/.exec(text)
        if (keep) {
          const id = keep[1]!
          const original = this.existing.get(id)
          if (original) {
            out.push(original as Block)
            this.keptIds.push(id)
          } else this.warnings.push(`Placeholder for block ${id} dropped: no such block on this page.`)
        } else if (idc && top) pendingId = idc[1]
        else if (!text.startsWith('<!--')) out.push(this.para(this.inline([{ type: 'text', raw: text, text } as Tokens.Text])))
        continue
      }
      const made = this.block(t)
      if (made.length && pendingId) {
        if (!this.existing.has(pendingId)) this.warnings.push(`lk:id=${pendingId} is not a block on this page; a new id was assigned.`)
        else (made[0] as Mutable<Block>).id = pendingId
        pendingId = undefined
      }
      out.push(...made)
    }
    return out
  }

  para(content: Run[]): Block {
    return { kind: 'paragraph', content }
  }

  block(t: Token): Block[] {
    switch (t.type) {
      case 'paragraph': {
        const p = t as Tokens.Paragraph
        // A paragraph that is only an image becomes an image block.
        const meaningful = p.tokens.filter((x) => !(x.type === 'text' && !x.text.trim()))
        if (meaningful.length && meaningful.every((x) => x.type === 'image' || x.type === 'br')) {
          return meaningful.filter((x) => x.type === 'image').map((x) => {
            const im = x as Tokens.Image
            return { kind: 'image', url: im.href, ...(im.text ? { alt: decode(im.text) } : {}) } as Block
          })
        }
        const content = this.inline(p.tokens)
        return content.length ? [this.para(content)] : []
      }
      case 'text': {
        const tt = t as Tokens.Text
        return [this.para(tt.tokens ? this.inline(tt.tokens) : this.text(decode(tt.text), {}))]
      }
      case 'heading': {
        const h = t as Tokens.Heading
        return [{ kind: 'heading', level: Math.min(6, Math.max(1, h.depth)) as 1, content: this.inline(h.tokens) }]
      }
      case 'code': {
        const c = t as Tokens.Code
        return [{ kind: 'code', text: c.text, ...(c.lang ? { language: c.lang } : {}) }]
      }
      case 'hr':
        return [{ kind: 'rule' }]
      case 'list':
        return [this.list(t as Tokens.List)]
      case 'table':
        return [this.table(t as Tokens.Table)]
      case 'blockquote':
        return [this.quote(t as Tokens.Blockquote)]
      default:
        if ('text' in t && typeof t.text === 'string' && t.text.trim()) return [this.para(this.text(decode(t.text), {}))]
        return []
    }
  }

  list(l: Tokens.List): Block {
    const items = l.items
    if (items.length && items.every((i) => i.task)) {
      return {
        kind: 'taskList',
        children: items.flatMap((i) => {
          const inner = i.tokens.filter((x) => x.type !== 'checkbox')
          const head = inner.filter((x) => x.type !== 'list')
          const nested = inner.filter((x) => x.type === 'list').map((x) => this.list(x as Tokens.List))
          const runs = head.flatMap((x) => (x.type === 'text' || x.type === 'paragraph' ? this.inline((x as Tokens.Text).tokens ?? [x]) : []))
          return [{ kind: 'taskItem', checked: Boolean(i.checked), content: runs } as Block, ...nested.filter((n) => n.kind === 'taskList')]
        }),
      } as Block
    }
    if (items.some((i) => i.task)) this.warnings.push('A list mixed checklist and plain items; written as a plain list.')
    const children = items.map((i) => {
      const inner = i.tokens.filter((x) => x.type !== 'checkbox')
      const kids = this.blocks(inner)
      if (kids[0]?.kind !== 'paragraph') kids.unshift(this.para([]))
      // A list item holds a paragraph followed by nested lists only.
      const [first, ...rest] = kids
      const lists = rest.filter((k) => k.kind === 'bulletList' || k.kind === 'orderedList')
      const extra = rest.filter((k) => k.kind !== 'bulletList' && k.kind !== 'orderedList')
      if (extra.length) {
        const merged = extra.flatMap((k) => (k.kind === 'paragraph' ? [{ break: true } as Run, ...(k as any).content] : []))
        ;(first as any).content = [...(first as any).content, ...merged]
        if (extra.some((k) => k.kind !== 'paragraph')) this.warnings.push('Non-paragraph content inside a list item was dropped (list items hold one paragraph plus nested lists).')
      }
      return { kind: 'listItem', children: [first!, ...lists] } as Block
    })
    if (l.ordered) {
      const start = typeof l.start === 'number' ? l.start : 1
      return { kind: 'orderedList', ...(start !== 1 ? { start } : {}), children } as Block
    }
    return { kind: 'bulletList', children } as Block
  }

  table(t: Tokens.Table): Block {
    const cell = (c: Tokens.TableCell, header: boolean) =>
      ({ kind: 'tableCell', ...(header ? { header: true } : {}), children: [this.para(this.inline(c.tokens))] }) as Block
    return {
      kind: 'table',
      children: [
        { kind: 'tableRow', children: t.header.map((c) => cell(c, true)) },
        ...t.rows.map((r) => ({ kind: 'tableRow', children: r.map((c) => cell(c, false)) })),
      ],
    } as Block
  }

  quote(q: Tokens.Blockquote): Block {
    const first = q.tokens[0]
    const marker = first?.type === 'paragraph' ? /^\[!(\w+)\]([+-]?)[ \t]*([^\n]*)\n?/.exec((first as Tokens.Paragraph).text) : null
    if (!marker) return { kind: 'quote', children: this.ensure(this.blocks(q.tokens)) } as Block
    const type = marker[1]!.toLowerCase()
    const title = marker[3]!.trim()
    // Re-lex the body without the marker line so inline formatting is parsed normally.
    const body = (first as Tokens.Paragraph).text.slice(marker[0].length)
    const rest = q.tokens.slice(1)
    const bodyTokens = body.trim() ? marked.lexer(body, { gfm: true }) : []
    const children = this.blocks([...bodyTokens, ...rest])
    if (type === 'secret') return { kind: 'secret', children: this.ensure(children) } as Block
    if (type === 'expand' || marker[2] === '-' || marker[2] === '+') {
      return { kind: 'expand', title: title || 'Details', children: this.ensure(children) } as Block
    }
    const tone = CALLOUT_ALIASES[type]
    if (!tone) this.warnings.push(`Unknown callout type [!${type}]; used "note".`)
    const kids = title ? [this.para([{ text: title, bold: true }]), ...children] : children
    return { kind: 'callout', tone: (tone ?? 'note') as 'note', children: this.ensure(kids) } as Block
  }

  ensure(children: Block[]): Block[] {
    return children.length ? children : [this.para([])]
  }
}

/** Index every block (and infobox property) of a page by id. */
export function indexBlocks(blocks: readonly Block[]): Map<string, AnyBlock> {
  const map = new Map<string, AnyBlock>()
  const visit = (b: AnyBlock) => {
    if (b.id) map.set(b.id, b)
    const anyB = b as any
    for (const c of anyB.children ?? []) visit(c)
    for (const r of anyB.kind === 'infobox' ? anyB.rows ?? [] : []) visit(r)
  }
  blocks.forEach(visit)
  return map
}

export function markdownToBlocks(markdown: string, options: { existing?: readonly Block[]; resolve?: NameResolver } = {}): ParseResult {
  const parser = new Parser(indexBlocks(options.existing ?? []), options.resolve)
  const tokens = marked.lexer(markdown.replace(/\r\n?/g, '\n'), { gfm: true })
  const blocks = parser.blocks(tokens, true)
  const seen = new Set<string>()
  for (const b of blocks) {
    if (!b.id) continue
    if (seen.has(b.id)) {
      parser.warnings.push(`Block ${b.id} appeared twice; the second copy got a new id.`)
      delete (b as Mutable<Block>).id
    } else seen.add(b.id)
  }
  return { blocks, warnings: parser.warnings, keptIds: parser.keptIds }
}

export const RICH_BLOCK_KINDS = RICH_KINDS
