import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { ConnectionError, LegendKeeperError, pixelToPos, type components } from '@legendkeeper/sdk'
import { infobox, keyValue, property, type Block, type PropertyBlock } from '@legendkeeper/sdk/blocks'
import { blocksToMarkdown, markdownToBlocks, propertyToText, RICH_BLOCK_KINDS, summarize } from './markdown.js'
import type { Config, ResourceListItem, World } from './world.js'

type Resource = components['schemas']['Resource']
type Doc = components['schemas']['Document']

class ToolError extends Error {}

const text = (s: string): CallToolResult => ({ content: [{ type: 'text', text: s }] })

function describeError(error: unknown): string {
  if (error instanceof ToolError) return error.message
  if (error instanceof LegendKeeperError) {
    const issues = (error.errors ?? []).map((i) => `\n  - ${i.path}: ${i.message}`).join('')
    const hint: Record<string, string> = {
      FORBIDDEN: ' The API key may be a MEMBER key; this needs an ADMIN key.',
      PAID_PLAN_REQUIRED: ' API keys need the project owner to be on a paid plan.',
      VERSION_MISMATCH: ' The page changed since it was read. Read it again and reapply the change.',
      HAS_CHILDREN: ' Pass cascade: true to delete the children too.',
      RATE_LIMITED: ' Wait a minute before retrying.',
      UNAUTHENTICATED: ' The API key is missing, revoked or expired.',
    }
    return `LegendKeeper error ${error.status} ${error.code ?? ''}: ${error.message}${issues}${hint[error.code ?? ''] ?? ''}${error.requestId ? `\n(request ${error.requestId})` : ''}`
  }
  if (error instanceof ConnectionError) return `Could not reach LegendKeeper: ${error.message}`
  return error instanceof Error ? error.message : String(error)
}

// ---------------------------------------------------------------- shared params

const worldParam = z.string().optional().describe('Which world (project) to use: its name from list_worlds. Optional when only one world is configured.')
const resourceParam = z.string().min(1).describe('Resource id, or its exact name (or alias) if that is unique.')
const documentParam = z.string().optional().describe('Document (tab) id or name. Defaults to the first suitable document of the resource.')

export function registerTools(server: McpServer, config: Config) {
  const { worlds, readOnly } = config

  async function getWorld(name?: string): Promise<World> {
    if (!name) {
      if (worlds.length === 1) return worlds[0]!
      const fallback = config.defaultWorld && worlds.find((w) => w.slug === config.defaultWorld)
      if (fallback) return fallback
      throw new ToolError(`Several worlds are configured; pass world as one of: ${worlds.map((w) => w.slug).join(', ')}.`)
    }
    const wanted = name.trim().toLowerCase()
    const bySlug = worlds.find((w) => w.slug === wanted)
    if (bySlug) return bySlug
    for (const w of worlds) {
      try {
        if ((await w.project()).name?.trim().toLowerCase() === wanted) return w
      } catch {}
    }
    throw new ToolError(`No world named "${name}". Configured: ${worlds.map((w) => w.slug).join(', ')}.`)
  }

  async function resolveResource(world: World, ref: string): Promise<ResourceListItem> {
    const byId = await world.byId(ref)
    if (byId) return byId
    const matches = await world.matchName(ref)
    if (matches.length === 1) return matches[0]!
    if (matches.length > 1) {
      throw new ToolError(`"${ref}" matches ${matches.length} resources; use an id:\n` + matches.map((m) => `- ${m.name} [${m.id}] in ${world.path(m).join(' / ') || 'root'}`).join('\n'))
    }
    // The cache may be stale: try the id directly.
    try {
      const r = await world.lk.resources.get({ resourceId: ref })
      world.invalidate()
      return r as unknown as ResourceListItem
    } catch {}
    throw new ToolError(`No resource with id or exact name "${ref}". Use search to find it.`)
  }

  async function pickDocument(world: World, resourceId: string, ref: string | undefined, accept: Doc['type'][]): Promise<Doc> {
    const { data: docs } = await world.lk.documents.list({ resourceId })
    const sorted = [...docs].sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0))
    if (ref) {
      const doc = sorted.find((d) => d.id === ref) ?? sorted.find((d) => d.name.toLowerCase() === ref.trim().toLowerCase())
      if (!doc) throw new ToolError(`No document "${ref}" on this resource. Documents: ${sorted.map((d) => `${d.name} (${d.type}) [${d.id}]`).join(', ') || 'none'}.`)
      if (!accept.includes(doc.type)) throw new ToolError(`Document "${doc.name}" is a ${doc.type}; this needs ${accept.join(' or ')}.`)
      return doc
    }
    const doc = sorted.find((d) => accept.includes(d.type) && d.type !== 'blank') ?? sorted.find((d) => d.type === 'blank' && accept.includes('blank'))
    if (!doc) throw new ToolError(`This resource has no ${accept.filter((t) => t !== 'blank').join('/')} document. Documents: ${sorted.map((d) => `${d.name} (${d.type})`).join(', ') || 'none'}.`)
    return doc
  }

  const label = (world: World, item: ResourceListItem) => {
    const path = world.path(item)
    return `${item.name} [${item.id}]${path.length ? ` in ${path.join(' / ')}` : ''}`
  }

  function tool<S extends z.ZodRawShape>(
    name: string,
    def: { title: string; description: string; input: S; write?: boolean; destructive?: boolean; idempotent?: boolean },
    handler: (args: z.infer<z.ZodObject<S>>) => Promise<string>,
  ) {
    if (def.write && readOnly) return
    server.registerTool(
      name,
      {
        title: def.title,
        description: def.description,
        inputSchema: def.input,
        annotations: {
          title: def.title,
          readOnlyHint: !def.write,
          destructiveHint: Boolean(def.destructive),
          idempotentHint: def.idempotent ?? !def.write,
          openWorldHint: true,
        },
      },
      (async (args: z.infer<z.ZodObject<S>>) => {
        try {
          return text(await handler(args))
        } catch (error) {
          return { ...text(describeError(error)), isError: true }
        }
      }) as never,
    )
  }

  // ================================================================ read tools

  tool('list_worlds', {
    title: 'List worlds',
    description: 'List the LegendKeeper worlds (projects) this server can reach, with their names and ids. Start here when unsure which world to use.',
    input: {},
  }, async () => {
    const lines = await Promise.all(worlds.map(async (w) => {
      try {
        const p = await w.project()
        return `- ${w.slug}: "${p.name}" [project ${p.id}]${p.isPublic ? ' (public)' : ''}${config.defaultWorld === w.slug ? ' (default)' : ''}`
      } catch (error) {
        return `- ${w.slug}: unavailable — ${describeError(error)}`
      }
    }))
    return `Worlds${readOnly ? ' (read-only mode)' : ''}:\n${lines.join('\n')}`
  })

  tool('browse', {
    title: 'Browse the world tree',
    description: 'Show the resource tree (characters, places, factions, ...) of a world as an outline with ids, tags and document types. Use under= to zoom into a branch, tag= to list everything with a tag.',
    input: {
      world: worldParam,
      under: z.string().optional().describe('Resource id or exact name to start from. Omit for the whole world.'),
      depth: z.number().int().min(1).max(10).default(2).describe('How many levels to show.'),
      tag: z.string().optional().describe('Only list resources with this tag (exact, case-sensitive), as a flat list.'),
      include_templates: z.boolean().default(false),
    },
  }, async ({ world: wname, under, depth, tag, include_templates }) => {
    const world = await getWorld(wname)
    const items = await world.resources()
    const visible = items.filter((i) => include_templates || !world.isTemplate(i))
    const describe = (i: ResourceListItem) => {
      const docs = (i.documents ?? []).map((d) => d.type).filter((t) => t !== 'blank')
      const extras = [i.tags?.length ? `tags: ${i.tags.join(', ')}` : '', docs.length ? docs.join('+') : '', i.isHidden ? 'hidden' : ''].filter(Boolean)
      return `${i.name} [${i.id}]${extras.length ? ` (${extras.join('; ')})` : ''}`
    }
    if (tag) {
      const tagged = visible.filter((i) => i.tags?.includes(tag))
      return tagged.length
        ? `${tagged.length} resources tagged "${tag}":\n` + tagged.map((i) => `- ${describe(i)}${world.path(i).length ? ` — ${world.path(i).join(' / ')}` : ''}`).join('\n')
        : `No resources tagged "${tag}". Tags are exact and case-sensitive; use list_tags.`
    }
    const children = new Map<string | null, ResourceListItem[]>()
    for (const i of visible) {
      const key = i.parentId ?? null
      if (!children.has(key)) children.set(key, [])
      children.get(key)!.push(i)
    }
    for (const list of children.values()) list.sort((a, b) => ((a.rank ?? '') < (b.rank ?? '') ? -1 : 1))
    const root = under ? await resolveResource(world, under) : undefined
    const lines: string[] = []
    const MAX = 500
    const walk = (parent: string | null, level: number) => {
      for (const i of children.get(parent) ?? []) {
        if (lines.length >= MAX) return
        const kids = children.get(i.id)?.length ?? 0
        lines.push(`${'  '.repeat(level)}- ${describe(i)}${kids && level + 1 >= depth ? ` +${kids} children` : ''}`)
        if (level + 1 < depth) walk(i.id, level + 1)
      }
    }
    if (root) lines.push(`${describe(root)}${world.path(root).length ? ` — in ${world.path(root).join(' / ')}` : ''}`)
    walk(root ? root.id : include_templates ? null : null, root ? 1 : 0)
    if (include_templates && !root) walk('templates', 0)
    const project = await world.project()
    const header = root ? '' : `${project.name}: ${visible.length} resources\n`
    return header + (lines.length ? lines.join('\n') : '(empty)') + (lines.length >= MAX ? `\n… truncated at ${MAX} lines; browse a branch with under=.` : '')
  })

  tool('search', {
    title: 'Search a world',
    description: 'Full-text search across resource names, aliases and page content. Returns matching resources with where the match is.',
    input: {
      world: worldParam,
      query: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(15),
    },
  }, async ({ world: wname, query, limit }) => {
    const world = await getWorld(wname)
    const hits = await world.lk.search.search({ q: query, limit })
    if (!hits.data.length) return `No results for "${query}".`
    return hits.data.map((hit) => {
      const r = hit.resource
      const path = (r.path ?? []).map((p) => p.name).join(' / ')
      const where = hit.document
        ? `in "${hit.document.name}" [doc ${hit.document.id}]: …${hit.document.highlights?.[0]?.segment?.replace(/\s+/g, ' ') ?? ''}…`
        : 'by name/alias'
      return `- ${r.name} [${r.id}]${path ? ` in ${path}` : ''}${r.tags?.length ? ` (tags: ${r.tags.join(', ')})` : ''} — ${where}`
    }).join('\n')
  })

  tool('list_tags', {
    title: 'List tags',
    description: 'List every tag used in a world with how many resources have it. Check this before tagging so you reuse existing spellings.',
    input: { world: worldParam },
  }, async ({ world: wname }) => {
    const world = await getWorld(wname)
    let tags: { tag: string; count: number }[]
    try {
      tags = (await world.lk.tags.list()).data
    } catch (error) {
      if (!(error instanceof LegendKeeperError && error.status === 403)) throw error
      const counts = new Map<string, number>()
      for (const i of await world.resources()) if (!world.isTemplate(i)) for (const t of i.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
      tags = [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
    }
    return tags.length ? tags.map((t) => `- ${t.tag} (${t.count})`).join('\n') : 'No tags yet.'
  })

  async function renderDocument(world: World, resourceId: string, doc: Doc, ids: boolean): Promise<string> {
    const head = `## ${doc.name} (${doc.type}) [doc ${doc.id}]${doc.isHidden ? ' (hidden)' : ''}\n`
    const ref = { resourceId, documentId: doc.id }
    switch (doc.type) {
      case 'blank':
        return head + '(empty — write a page, map pins or timeline events to give it a type)'
      case 'page': {
        const page = await world.lk.documents.getBlocks(ref)
        const md = blocksToMarkdown(page.blocks, { ids })
        const hasRich = page.blocks.some((b) => RICH_BLOCK_KINDS.has(b.kind))
        return head + `version: ${page.version}\n\n` + (md || '(empty page)') +
          (hasRich ? '\n\n(Lines like <!-- lk:keep ... --> are rich blocks such as infoboxes. Keep those lines when rewriting the page to preserve them.)' : '')
      }
      case 'map': {
        const full = await world.lk.documents.get(ref)
        const { data: features } = await world.lk.features.list(ref)
        const folders = new Map(features.filter((f) => f.type === 'folder').map((f) => [f.id, f.name ?? f.id]))
        const img = full.mapImage
        const lines = features.filter((f) => f.type !== 'folder').map((f) =>
          `- ${f.type} "${f.name ?? ''}" [${f.id}]${f.pos ? ` at ${JSON.stringify(f.pos)}` : ''}${f.uri ? ` → ${f.uri}` : ''}${f.parentId && folders.has(f.parentId) ? ` (folder ${folders.get(f.parentId)})` : ''}`)
        return head + (img ? `image ${img.width}×${img.height}px, bounds ${JSON.stringify(img.bounds)}\n` : 'no map image yet\n') +
          (folders.size ? `folders: ${[...folders].map(([id, n]) => `${n} [${id}]`).join(', ')}\n` : '') +
          (lines.length ? lines.join('\n') : '(no features)')
      }
      case 'time': {
        const full = await world.lk.documents.get(ref)
        const { data: lanes } = await world.lk.timelines.listLanes(ref)
        const laneName = new Map(lanes.map((l) => [l.id, l.name]))
        const events: string[] = []
        for await (const e of await world.lk.timelines.listEvents(ref, { limit: 100 })) {
          if (events.length >= 500) break
          events.push(`- ${e.formattedStart ?? e.start}${e.formattedEnd ? ` – ${e.formattedEnd}` : ''}: ${e.name ?? '(untitled)'} [${e.id}] (lane ${laneName.get(e.laneId) ?? e.laneId}${e.type !== 'event' ? `, ${e.type}` : ''})${e.uri ? ` → ${e.uri}` : ''}`)
        }
        return head + `calendar: ${full.calendarId ?? 'gregorian'}\nlanes: ${[...lanes].sort((a, b) => (a.rank < b.rank ? -1 : 1)).map((l) => `${l.name} [${l.id}]`).join(', ') || 'none'}\n` +
          (events.length ? events.join('\n') : '(no events)')
      }
      case 'board': {
        const { data: shapes } = await world.lk.boards.listShapes(ref)
        const texts = shapes.map((s: any) => s.props?.text ?? s.props?.richText?.text).filter((t: unknown) => typeof t === 'string' && t.trim())
        return head + `${shapes.length} shapes.` + (texts.length ? `\nText on the board:\n${texts.map((t: string) => `- ${t.replace(/\s+/g, ' ')}`).join('\n')}` : '')
      }
      default:
        return head
    }
  }

  tool('get_resource', {
    title: 'Get a resource',
    description: 'Read one resource: its path, tags, aliases, icon, documents, sidebar properties and (by default) its main page as Markdown.',
    input: {
      world: worldParam,
      resource: resourceParam,
      include_content: z.boolean().default(true).describe('Also include the main page content.'),
    },
  }, async ({ world: wname, resource, include_content }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    const r = (await world.lk.resources.get({ resourceId: item.id })) as Resource
    const docs = [...r.documents].sort((a, b) => (a.rank < b.rank ? -1 : 1))
    const kids = (await world.resources()).filter((i) => i.parentId === r.id)
    const parts = [
      `# ${r.name} [${r.id}]`,
      `path: ${world.path(item).join(' / ') || '(root)'}${world.isTemplate(item) ? ' (template)' : ''}`,
      r.tags.length ? `tags: ${r.tags.join(', ')}` : '',
      r.aliases.length ? `aliases: ${r.aliases.join(', ')}` : '',
      r.iconGlyph || r.iconColor ? `icon: ${r.iconGlyph ?? ''} ${r.iconColor ?? ''}`.trim() : '',
      r.isHidden ? 'hidden from players' : '',
      `documents: ${docs.map((d) => `${d.name} (${d.type}) [${d.id}]`).join(', ')}`,
      kids.length ? `children: ${kids.map((k) => `${k.name} [${k.id}]`).join(', ')}` : '',
      r.properties?.length ? `sidebar:\n${(r.properties as PropertyBlock[]).map((p) => propertyToText(p)).join('\n')}` : '',
    ].filter(Boolean)
    if (include_content) {
      const main = docs.find((d) => d.type === 'page') ?? docs[0]
      if (main) parts.push('', await renderDocument(world, r.id, main as Doc, false))
    }
    return parts.join('\n')
  })

  tool('read_document', {
    title: 'Read a document',
    description: 'Read one document (tab) of a resource. Pages come back as Markdown with their version; maps as pins/regions with coordinates; timelines as lanes and dated events; boards as their text. Use with_block_ids before rewriting a page so block ids stay stable.',
    input: {
      world: worldParam,
      resource: resourceParam,
      document: documentParam,
      with_block_ids: z.boolean().default(false).describe('Precede each page block with <!-- lk:id=... --> so a rewrite keeps block ids.'),
    },
  }, async ({ world: wname, resource, document, with_block_ids }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    const doc = await pickDocument(world, item.id, document, ['page', 'map', 'time', 'board', 'blank'])
    return `${label(world, item)}\n` + (await renderDocument(world, item.id, doc, with_block_ids))
  })

  // ================================================================ write tools

  const MARKDOWN_HELP = 'GitHub-flavoured Markdown. Extras: [[Exact Name]] or [Label](lk://resources/<id>) for mentions (links to other pages); > [!note|info|success|warning|error] for callouts; > [!secret] for GM-only content hidden from players; > [!expand] Title for a collapsible section; <u>, <sub>, <sup>; - [ ] checklists; tables; ![alt](url) on its own line for images (url must be a LegendKeeper asset url from upload_image).'

  async function pageBlocks(world: World, markdown: string, existing: readonly Block[] = []) {
    await world.resources()
    return markdownToBlocks(markdown, { existing, resolve: world.nameResolver() })
  }

  const factsBlock = (facts: Record<string, string>, title: string) =>
    infobox(property(keyValue(Object.entries(facts).filter(([, v]) => v !== '')), { title }))

  tool('create_resource', {
    title: 'Create a resource',
    description: `Create a new resource (character, place, faction, item, ...) in the world tree, optionally with a page written in Markdown and an infobox of facts. ${MARKDOWN_HELP}`,
    write: true,
    input: {
      world: worldParam,
      name: z.string().min(1).max(500),
      parent: z.string().optional().describe('Parent resource id or exact name. Omit to create at the root (needs an ADMIN key).'),
      content: z.string().optional().describe('Page content in Markdown.'),
      facts: z.record(z.string(), z.string()).optional().describe('Quick facts shown in an infobox at the top of the page, e.g. {"Race": "Elf", "Age": "312"}.'),
      tags: z.array(z.string().max(100)).max(50).optional().describe('Reuse existing tags (see list_tags); title case, one per facet.'),
      aliases: z.array(z.string().max(256)).max(128).optional(),
      icon_glyph: z.string().max(128).optional().describe('Font Awesome icon name, e.g. crown, dragon, city, user.'),
      icon_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      hidden: z.boolean().optional().describe('Hide from players (ADMIN key).'),
      after: z.string().optional().describe('Place right after this sibling (id or exact name).'),
    },
  }, async ({ world: wname, name, parent, content, facts, tags, aliases, icon_glyph, icon_color, hidden, after }) => {
    const world = await getWorld(wname)
    const parentItem = parent ? await resolveResource(world, parent) : undefined
    const afterItem = after ? await resolveResource(world, after) : undefined
    let warnings: string[] = []
    let blocks: Block[] = []
    if (content?.trim()) ({ blocks, warnings } = await pageBlocks(world, content))
    if (facts && Object.keys(facts).length) blocks.unshift(factsBlock(facts, 'Facts'))
    const created = await world.lk.resources.create({
      name,
      ...(parentItem ? { parentId: parentItem.id } : {}),
      ...(afterItem ? { after: afterItem.id } : {}),
      ...(tags ? { tags } : {}),
      ...(aliases ? { aliases } : {}),
      ...(icon_glyph ? { iconGlyph: icon_glyph } : {}),
      ...(icon_color ? { iconColor: icon_color } : {}),
      ...(hidden !== undefined ? { isHidden: hidden } : {}),
      ...(blocks.length ? { documents: [{ type: 'page' as const, name: 'Main', blocks }] } : {}),
    })
    world.invalidate()
    return `Created ${created.name} [${created.id}]${parentItem ? ` under ${parentItem.name}` : ' at the root'} with ${created.documents.length} document(s).` +
      (warnings.length ? `\nWarnings:\n- ${warnings.join('\n- ')}` : '')
  })

  tool('update_resource', {
    title: 'Update a resource',
    description: 'Rename a resource or change its tags, aliases, icon or visibility. Only the fields you pass change. To change page content use write_page.',
    write: true,
    idempotent: true,
    input: {
      world: worldParam,
      resource: resourceParam,
      name: z.string().min(1).max(500).optional(),
      tags: z.array(z.string()).optional().describe('Replaces all tags.'),
      add_tags: z.array(z.string()).optional(),
      remove_tags: z.array(z.string()).optional(),
      aliases: z.array(z.string()).optional().describe('Replaces all aliases.'),
      icon_glyph: z.string().optional(),
      icon_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      hidden: z.boolean().optional(),
      locked: z.boolean().optional(),
    },
  }, async ({ world: wname, resource, name, tags, add_tags, remove_tags, aliases, icon_glyph, icon_color, hidden, locked }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    let newTags = tags
    if (add_tags || remove_tags) {
      const current = new Set(tags ?? item.tags ?? [])
      for (const t of add_tags ?? []) current.add(t)
      for (const t of remove_tags ?? []) current.delete(t)
      newTags = [...current]
    }
    const body = {
      ...(name ? { name } : {}),
      ...(newTags ? { tags: newTags } : {}),
      ...(aliases ? { aliases } : {}),
      ...(icon_glyph ? { iconGlyph: icon_glyph } : {}),
      ...(icon_color ? { iconColor: icon_color } : {}),
      ...(hidden !== undefined ? { isHidden: hidden } : {}),
      ...(locked !== undefined ? { isLocked: locked } : {}),
    }
    if (!Object.keys(body).length) throw new ToolError('Nothing to change.')
    const updated = (await world.lk.resources.update({ resourceId: item.id }, body)) as Resource
    world.invalidate()
    return `Updated ${updated.name} [${updated.id}]: tags ${updated.tags.join(', ') || '(none)'}${updated.aliases.length ? `; aliases ${updated.aliases.join(', ')}` : ''}.`
  })

  tool('move_resource', {
    title: 'Move a resource',
    description: 'Move a resource (with its children) to a new parent, and/or reorder it among its siblings.',
    write: true,
    idempotent: true,
    input: {
      world: worldParam,
      resource: resourceParam,
      new_parent: z.string().optional().describe('New parent id or exact name, or "root". Omit to stay under the current parent.'),
      after: z.string().optional().describe('Place right after this sibling.'),
      before: z.string().optional().describe('Place right before this sibling.'),
    },
  }, async ({ world: wname, resource, new_parent, after, before }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    if (after && before) throw new ToolError('Pass after or before, not both.')
    const parentId = new_parent === undefined ? undefined : new_parent.toLowerCase() === 'root' ? null : (await resolveResource(world, new_parent)).id
    const moved = await world.lk.resources.move({ resourceId: item.id }, {
      ...(parentId !== undefined ? { parentId } : {}),
      ...(after ? { after: (await resolveResource(world, after)).id } : {}),
      ...(before ? { before: (await resolveResource(world, before)).id } : {}),
    })
    world.invalidate()
    await world.resources()
    const now = await world.byId(moved.id)
    return `Moved ${moved.name} to ${now ? world.path(now).join(' / ') || 'the root' : 'its new place'}.`
  })

  tool('delete_resource', {
    title: 'Delete a resource',
    description: 'Delete a resource with its documents. Fails if it has children unless cascade is true. Deleted resources can be brought back with restore_resource using the id this returns. Confirm with the user before deleting.',
    write: true,
    destructive: true,
    input: {
      world: worldParam,
      resource: resourceParam,
      cascade: z.boolean().default(false).describe('Also delete all descendants.'),
    },
  }, async ({ world: wname, resource, cascade }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    await world.lk.resources.delete({ resourceId: item.id }, cascade ? { cascade: true } : {})
    world.invalidate()
    return `Deleted ${item.name} [${item.id}]${cascade ? ' and its descendants' : ''}. Restore with restore_resource id ${item.id}.`
  })

  tool('restore_resource', {
    title: 'Restore a deleted resource',
    description: 'Restore a deleted resource (and the descendants deleted with it) by id. Needs an ADMIN key.',
    write: true,
    idempotent: true,
    input: { world: worldParam, resource_id: z.string().min(1) },
  }, async ({ world: wname, resource_id }) => {
    const world = await getWorld(wname)
    const r = await world.lk.resources.restore({ resourceId: resource_id })
    world.invalidate()
    return `Restored ${r.name} [${r.id}].`
  })

  tool('write_page', {
    title: 'Write a page',
    description: `Write Markdown to a page document. mode=append adds to the end, prepend adds to the top, replace rewrites the whole page. For replace, read the page first (read_document, ideally with_block_ids) and keep its <!-- lk:keep ... --> lines where those blocks should stay; replace refuses to drop infoboxes and other rich blocks unless allow_removing_rich_blocks is true. Pass the version you read as expected_version so edits made in the app since then are not overwritten. ${MARKDOWN_HELP}`,
    write: true,
    input: {
      world: worldParam,
      resource: resourceParam,
      document: documentParam,
      new_document_name: z.string().optional().describe('Create a new page tab with this name and write to it instead.'),
      markdown: z.string(),
      mode: z.enum(['append', 'prepend', 'replace']).default('append'),
      expected_version: z.string().optional().describe('The page version from your last read; the write fails if the page changed since.'),
      allow_removing_rich_blocks: z.boolean().default(false),
    },
  }, async ({ world: wname, resource, document, new_document_name, markdown, mode, expected_version, allow_removing_rich_blocks }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    const doc = new_document_name
      ? await world.lk.documents.create({ resourceId: item.id }, { name: new_document_name, type: 'page' })
      : await pickDocument(world, item.id, document, ['page', 'blank'])
    const ref = { resourceId: item.id, documentId: doc.id }
    const current = await world.lk.documents.getBlocks(ref)
    const { blocks: parsed, warnings, keptIds } = await pageBlocks(world, markdown, current.blocks)
    let blocks: Block[]
    if (mode === 'replace') {
      const kept = new Set(keptIds)
      for (const b of parsed) if (b.id) kept.add(b.id)
      const dropped = current.blocks.filter((b) => (RICH_BLOCK_KINDS.has(b.kind) || b.kind === 'image') && b.id && !kept.has(b.id))
      if (dropped.length && !allow_removing_rich_blocks) {
        throw new ToolError(`Not written: replace would remove ${dropped.length} rich block(s):\n${dropped.map((b) => `<!-- lk:keep id=${b.id} kind=${b.kind} | ${summarize(b).slice(0, 120)} -->`).join('\n')}\nInclude those lines in the Markdown to keep them, or set allow_removing_rich_blocks to remove them.`)
      }
      blocks = parsed
    } else {
      const fresh = parsed.filter((b) => !b.id || !current.blocks.some((c) => c.id === b.id))
      blocks = mode === 'append' ? [...current.blocks, ...fresh] : [...fresh, ...current.blocks]
    }
    const ifMatch = expected_version ?? current.version
    const written = await world.lk.documents.replaceBlocks(ref, { blocks, ...(ifMatch ? { ifMatch } : {}) })
    return `Wrote ${item.name} / ${doc.name} [doc ${doc.id}] (${mode}): ${written.blocks.length} top-level blocks, version ${written.version}.` +
      (warnings.length ? `\nWarnings:\n- ${warnings.join('\n- ')}` : '')
  })

  tool('set_facts', {
    title: 'Set facts',
    description: 'Set key-value facts (Age, Ruler, Population, ...) on a resource, in the infobox at the top of its page (default) or in the sidebar. Existing keys are updated, new ones added; an empty string removes a key.',
    write: true,
    idempotent: true,
    input: {
      world: worldParam,
      resource: resourceParam,
      facts: z.record(z.string(), z.string()),
      where: z.enum(['infobox', 'sidebar']).default('infobox').describe('infobox: on the main page; sidebar: beside every document of the resource.'),
      group: z.string().default('Facts').describe('Title of the key-value group to edit or create.'),
    },
  }, async ({ world: wname, resource, facts, where, group }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    const applyRows = (rows: any[]) => {
      const out = rows.map((r) => ({ ...r }))
      for (const [key, value] of Object.entries(facts)) {
        const i = out.findIndex((r) => r.key.trim().toLowerCase() === key.trim().toLowerCase())
        if (value === '') {
          if (i >= 0) out.splice(i, 1)
        } else if (i >= 0) {
          const { content: _c, ...rest } = out[i]
          out[i] = { ...rest, text: value }
        } else out.push({ key, text: value })
      }
      return out
    }
    const sameTitle = (p: any) => p.kind === 'keyValue' && (p.title ?? 'Stats').trim().toLowerCase() === group.trim().toLowerCase()

    if (where === 'sidebar') {
      const { data: props } = await world.lk.properties.list({ resourceId: item.id })
      const existing = props.find(sameTitle) as any
      if (!existing) {
        const rows = applyRows([])
        if (!rows.length) return 'Nothing to set.'
        await world.lk.properties.create({ resourceId: item.id }, property(keyValue(rows.map((r) => [r.key, r.text] as [string, string])), { title: group }))
        return `Added sidebar group "${group}" to ${item.name}: ${rows.map((r) => `${r.key}=${r.text}`).join(', ')}.`
      }
      const target = { resourceId: item.id, propertyId: existing.id }
      const { data: rows } = await world.lk.properties.listRows(target)
      for (const [key, value] of Object.entries(facts)) {
        const row = rows.find((r) => r.key.trim().toLowerCase() === key.trim().toLowerCase())
        if (value === '' && row?.id) await world.lk.properties.deleteRow({ ...target, rowId: row.id })
        else if (row?.id && value !== '') await world.lk.properties.updateRow({ ...target, rowId: row.id }, { text: value })
        else if (value !== '') await world.lk.properties.createRow(target, { key, text: value })
      }
      return `Updated sidebar group "${group}" on ${item.name}.`
    }

    const doc = await pickDocument(world, item.id, undefined, ['page', 'blank'])
    const ref = { resourceId: item.id, documentId: doc.id }
    const page = await world.lk.documents.getBlocks(ref)
    const blocks = [...page.blocks] as any[]
    const boxIndex = blocks.findIndex((b) => b.kind === 'infobox')
    if (boxIndex < 0) {
      const rows = applyRows([])
      if (!rows.length) return 'Nothing to set.'
      blocks.unshift(infobox(property(keyValue(rows.map((r) => [r.key, r.text] as [string, string])), { title: group })))
    } else {
      const box = { ...blocks[boxIndex], rows: [...blocks[boxIndex].rows] }
      const pIndex = box.rows.findIndex(sameTitle)
      if (pIndex >= 0) box.rows[pIndex] = { ...box.rows[pIndex], rows: applyRows(box.rows[pIndex].rows ?? []) }
      else box.rows.push(property(keyValue(applyRows([]).map((r) => [r.key, r.text] as [string, string])), { title: group }))
      blocks[boxIndex] = box
    }
    const written = await world.lk.documents.replaceBlocks(ref, { blocks, ...(page.version ? { ifMatch: page.version } : {}) })
    const box = written.blocks.find((b) => b.kind === 'infobox')
    return `Infobox on ${item.name} / ${doc.name} now: ${box ? summarize(box) : '(none)'}.`
  })

  tool('add_map_pin', {
    title: 'Add a map pin',
    description: 'Add a pin (or label) to a map document, positioned by pixel on the map image (x from the left, y from the top) or by [lat, lng]. Link it to the resource it marks so clicking the pin opens that page.',
    write: true,
    input: {
      world: worldParam,
      resource: resourceParam.describe('The resource that holds the map.'),
      document: documentParam,
      name: z.string().min(1),
      x: z.number().optional(),
      y: z.number().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      links_to: z.string().optional().describe('Resource id or exact name the pin opens.'),
      kind: z.enum(['pin', 'label']).default('pin'),
      icon_glyph: z.string().optional().describe('Font Awesome icon. Defaults to the linked resource\'s icon, else location-dot.'),
      folder: z.string().optional().describe('Map folder name to put the pin in; created if missing.'),
    },
  }, async ({ world: wname, resource, document, name, x, y, lat, lng, links_to, kind, icon_glyph, folder }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    const doc = await pickDocument(world, item.id, document, ['map', 'blank'])
    const ref = { resourceId: item.id, documentId: doc.id }
    let pos: [number, number]
    if (x !== undefined && y !== undefined) {
      const full = await world.lk.documents.get(ref)
      if (!full.mapImage) throw new ToolError('This map has no image, so pixel positions mean nothing. Pass lat/lng instead.')
      pos = pixelToPos(full.mapImage, x, y)
    } else if (lat !== undefined && lng !== undefined) pos = [lat, lng]
    else throw new ToolError('Pass x and y (pixels on the map image) or lat and lng.')
    const target = links_to ? await resolveResource(world, links_to) : undefined
    let parentId: string | undefined
    if (folder) {
      const { data: features } = await world.lk.features.list(ref, { type: 'folder' })
      parentId = features.find((f) => f.name?.toLowerCase() === folder.toLowerCase())?.id ?? (await world.lk.features.create(ref, { type: 'folder', name: folder })).id
    }
    const f = await world.lk.features.create(ref, {
      type: kind,
      name,
      pos,
      ...(parentId ? { parentId } : {}),
      ...(target ? { uri: `lk://resources/${target.id}` } : {}),
      ...(kind === 'pin' ? { iconShape: 'none' as const, iconGlyph: icon_glyph ?? target?.iconGlyph ?? 'location-dot' } : {}),
    })
    return `Added ${kind} "${name}" [${f.id}] at ${JSON.stringify(pos)} on ${item.name} / ${doc.name}${target ? `, linked to ${target.name}` : ''}.`
  })

  tool('add_timeline_event', {
    title: 'Add a timeline event',
    description: 'Add an event to a timeline document. Dates are written as text in the timeline\'s calendar, e.g. "1372 DR", "June 2012", "March 3rd, 1016 AMW". The lane is created if missing. Keep the name short; put the full account on a linked page.',
    write: true,
    input: {
      world: worldParam,
      resource: resourceParam.describe('The resource that holds the timeline.'),
      document: documentParam,
      lane: z.string().describe('Lane name (created if it does not exist).'),
      name: z.string().min(1).max(500),
      start: z.string().describe('Start date as text in the timeline calendar.'),
      end: z.string().optional().describe('End date for a span.'),
      links_to: z.string().optional().describe('Resource id or exact name the event opens.'),
      type: z.enum(['event', 'note']).default('event'),
    },
  }, async ({ world: wname, resource, document, lane, name, start, end, links_to, type }) => {
    const world = await getWorld(wname)
    const item = await resolveResource(world, resource)
    const doc = await pickDocument(world, item.id, document, ['time', 'blank'])
    const ref = { resourceId: item.id, documentId: doc.id }
    const { data: lanes } = await world.lk.timelines.listLanes(ref)
    let laneRec = lanes.find((l) => l.name.toLowerCase() === lane.toLowerCase())
    if (!laneRec) {
      const last = lanes.map((l) => l.rank).sort().pop()
      laneRec = await world.lk.timelines.createLane(ref, { name: lane, rank: last ? `${last}V` : 'a0', size: 'lg' })
    }
    const target = links_to ? await resolveResource(world, links_to) : undefined
    const e = await world.lk.timelines.createEvent(ref, {
      laneId: laneRec.id,
      type,
      name,
      formattedStart: start,
      ...(end ? { formattedEnd: end } : {}),
      ...(target ? { uri: `lk://resources/${target.id}` } : {}),
    })
    return `Added "${name}" [${e.id}] on lane ${laneRec.name}: ${e.formattedStart}${e.formattedEnd ? ` – ${e.formattedEnd}` : ''} (${e.startDate?.iso ?? `${e.startDate?.year} ${e.startDate?.era?.abbr ?? ''}`.trim()}).`
  })

  tool('upload_image', {
    title: 'Upload an image',
    description: 'Copy an image from a public URL into the world\'s asset library and return its LegendKeeper URL, for use as ![alt](url) in write_page, in banners or as a map image. Pages can only show images uploaded this way.',
    write: true,
    input: {
      world: worldParam,
      url: z.string().url(),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
    },
  }, async ({ world: wname, url, name, description }) => {
    const world = await getWorld(wname)
    await assertPublicUrl(url)
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new ToolError(`Fetching the image answered ${response.status}.`)
    const type = (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(type)) throw new ToolError(`Unsupported image type "${type || 'unknown'}". Use JPEG, PNG, GIF or WebP.`)
    const data = new Uint8Array(await response.arrayBuffer())
    if (data.byteLength > 25 * 1024 * 1024) throw new ToolError('Image is larger than 25 MB.')
    const asset = await world.lk.assets.uploadImage({ data, contentType: type as 'image/png', name, ...(description ? { description } : {}) })
    return `Uploaded "${asset.name}" [asset ${asset.id}] ${asset.width}×${asset.height}px.\nurl: ${asset.url}\nMarkdown: ![${name}](${asset.url})`
  })

  tool('api_request', {
    title: 'Raw LegendKeeper API call',
    description: 'Call any LegendKeeper v3 API route directly, for things the other tools do not cover (boards, calendars, block-level edits, sidebar properties, members, map regions, ...). path is relative to the project, e.g. "/resources/{id}/docs/{docId}/blocks/{blockId}" or "/calendars". Returns the JSON response.',
    input: {
      world: worldParam,
      method: z.enum(readOnly ? ['GET'] : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      path: z.string().regex(/^\/(?!.*\.\.)/, 'must start with / and not contain ..'),
      query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      body: z.unknown().optional(),
      if_match: z.string().optional().describe('Document/board/calendar version for versioned writes.'),
    },
  }, async ({ world: wname, method, path, query, body, if_match }) => {
    const world = await getWorld(wname)
    const project = await world.project()
    const full = path.startsWith('/api/') ? path : `/api/v3/projects/${project.id}${path}`
    if (!full.startsWith(`/api/v3/projects/${project.id}`) && !(method === 'GET' && full.startsWith('/api/v3/projects'))) {
      throw new ToolError('Path must stay within this world\'s project.')
    }
    const headers: Record<string, string> = {}
    if (if_match) headers['If-Match'] = if_match
    if (method === 'POST') headers['Idempotency-Key'] = crypto.randomUUID()
    const result = await world.lk.request({ method, path: full, ...(query ? { query } : {}), ...(body !== undefined ? { body } : {}), headers })
    if (method !== 'GET') world.invalidate()
    const json = JSON.stringify(result ?? null, null, 1)
    return json.length > 100_000 ? json.slice(0, 100_000) + '\n… truncated' : json
  })
}

/** Refuse URLs that point at private or local networks, so the server cannot be used to probe them. */
async function assertPublicUrl(raw: string) {
  const url = new URL(raw)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new ToolError('Only http and https URLs are allowed.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  for (const a of addresses) {
    const v4 = a.startsWith('::ffff:') ? a.slice(7) : a
    if (
      /^(10|127|0)\./.test(v4) || /^169\.254\./.test(v4) || /^192\.168\./.test(v4) || /^172\.(1[6-9]|2\d|3[01])\./.test(v4) ||
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(v4) || v4 === '::1' || /^f[cd]/i.test(v4) || /^fe80/i.test(v4) || v4 === '::'
    ) throw new ToolError('That URL points at a private or local address.')
  }
}

export const SERVER_INSTRUCTIONS = `This server reads and edits LegendKeeper worlds (worldbuilding wikis for tabletop games and fiction).
- Find things with search or browse; read with get_resource / read_document. Resources can be named by id or exact name.
- Pages are exchanged as Markdown. Lines like <!-- lk:keep id=... kind=... | summary --> are rich blocks (infoboxes, collections, ...): keep them when rewriting a page.
- Before write_page with mode=replace, read the page (with_block_ids) and pass its version as expected_version.
- Match the world's existing conventions: reuse tags from list_tags, link names with [[Exact Name]] mentions, put quick facts in the infobox with set_facts, keep timeline event names short.
- Confirm with the user before deleting anything. Content in > [!secret] blocks is hidden from players.`
