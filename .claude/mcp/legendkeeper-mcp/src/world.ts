import { LegendKeeper, type components } from '@legendkeeper/sdk'

export type ResourceListItem = components['schemas']['ResourceListItem']
export type Project = components['schemas']['Project']

const CACHE_MS = 60_000

/** One LegendKeeper project ("world"), reached with one API key. */
export class World {
  readonly lk: LegendKeeper
  private projectInfo?: Project
  private cache?: { at: number; items: ResourceListItem[]; byId: Map<string, ResourceListItem> }
  private loading?: Promise<ResourceListItem[]>

  constructor(readonly slug: string, apiKey: string, fetchImpl?: typeof fetch) {
    this.lk = new LegendKeeper({ apiKey, ...(fetchImpl ? { fetch: fetchImpl } : {}) })
  }

  async project(): Promise<Project> {
    this.projectInfo ??= await this.lk.project()
    return this.projectInfo
  }

  /** Every resource and template in the world, cached for a minute. */
  async resources(force = false): Promise<ResourceListItem[]> {
    if (!force && this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.items
    this.loading ??= (async () => {
      const items: ResourceListItem[] = []
      for await (const item of await this.lk.resources.list({ limit: 100 })) items.push(item)
      this.cache = { at: Date.now(), items, byId: new Map(items.map((i) => [i.id, i])) }
      return items
    })().finally(() => (this.loading = undefined))
    return this.loading
  }

  invalidate() {
    this.cache = undefined
  }

  async byId(id: string): Promise<ResourceListItem | undefined> {
    await this.resources()
    return this.cache?.byId.get(id)
  }

  isTemplate(item: ResourceListItem): boolean {
    let current: ResourceListItem | undefined = item
    for (let guard = 0; current && guard < 100; guard++) {
      if (current.parentId === 'templates') return true
      current = current.parentId ? this.cache?.byId.get(current.parentId) : undefined
    }
    return false
  }

  /** Ancestor names from the root down, excluding the resource itself. */
  path(item: ResourceListItem): string[] {
    const names: string[] = []
    let current = item.parentId ? this.cache?.byId.get(item.parentId) : undefined
    for (let guard = 0; current && guard < 100; guard++) {
      names.unshift(current.name)
      current = current.parentId ? this.cache?.byId.get(current.parentId) : undefined
    }
    return names
  }

  /** Non-template resources whose name or alias equals `name`, ignoring case. */
  async matchName(name: string): Promise<ResourceListItem[]> {
    const wanted = name.trim().toLowerCase()
    const items = await this.resources()
    const byName = items.filter((i) => i.name.trim().toLowerCase() === wanted && !this.isTemplate(i))
    if (byName.length) return byName
    return items.filter((i) => i.aliases?.some((a) => a.trim().toLowerCase() === wanted) && !this.isTemplate(i))
  }

  /** Synchronous resolver over the current cache, for [[wiki links]]. Call resources() first. */
  nameResolver(): (name: string) => string | undefined {
    const index = new Map<string, string | null>()
    const add = (key: string, id: string) => {
      const k = key.trim().toLowerCase()
      index.set(k, index.has(k) && index.get(k) !== id ? null : id)
    }
    const items = this.cache?.items ?? []
    for (const i of items) if (!this.isTemplate(i)) add(i.name, i.id)
    const aliasIndex = new Map<string, string | null>()
    for (const i of items) {
      if (this.isTemplate(i)) continue
      for (const a of i.aliases ?? []) {
        const k = a.trim().toLowerCase()
        aliasIndex.set(k, aliasIndex.has(k) && aliasIndex.get(k) !== i.id ? null : i.id)
      }
    }
    return (name) => {
      const k = name.trim().toLowerCase()
      if (index.has(k)) return index.get(k) ?? undefined
      return aliasIndex.get(k) ?? undefined
    }
  }
}

export interface Config {
  worlds: World[]
  defaultWorld?: string
  readOnly: boolean
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'world'

/**
 * Worlds come from any mix of:
 *   LEGENDKEEPER_API_KEY=lk_...                 one world, named by LEGENDKEEPER_WORLD_NAME or "default"
 *   LEGENDKEEPER_KEY_<NAME>=lk_...              one world per variable, e.g. LEGENDKEEPER_KEY_OOO
 *   LEGENDKEEPER_WORLDS='{"ooo":"lk_..."}'      a JSON object of name -> key
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, fetchImpl?: typeof fetch): Config {
  const keys = new Map<string, string>()
  if (env.LEGENDKEEPER_API_KEY) keys.set(slugify(env.LEGENDKEEPER_WORLD_NAME ?? 'default'), env.LEGENDKEEPER_API_KEY)
  for (const [name, value] of Object.entries(env)) {
    const m = /^LEGENDKEEPER_KEY_(.+)$/.exec(name)
    if (m && value) keys.set(slugify(m[1]!), value)
  }
  if (env.LEGENDKEEPER_WORLDS) {
    let parsed: unknown
    try {
      parsed = JSON.parse(env.LEGENDKEEPER_WORLDS)
    } catch {
      throw new Error('LEGENDKEEPER_WORLDS must be a JSON object such as {"ooo":"lk_..."}')
    }
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value) keys.set(slugify(name), value)
    }
  }
  if (!keys.size) {
    throw new Error('No LegendKeeper API key configured. Set LEGENDKEEPER_API_KEY, LEGENDKEEPER_KEY_<NAME> or LEGENDKEEPER_WORLDS.')
  }
  const truthy = (v?: string) => /^(1|true|yes|on)$/i.test(v ?? '')
  return {
    worlds: [...keys].map(([slug, key]) => new World(slug, key, fetchImpl)),
    defaultWorld: env.LEGENDKEEPER_DEFAULT_WORLD ? slugify(env.LEGENDKEEPER_DEFAULT_WORLD) : undefined,
    readOnly: truthy(env.LEGENDKEEPER_READ_ONLY),
  }
}
