/** Validates request bodies against the LegendKeeper OpenAPI schemas shipped with the SDK. */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const require = createRequire(import.meta.url)
const specPath = require.resolve('@legendkeeper/sdk').replace(/dist[\\/]index\.c?js$/, 'openapi.json')
const spec = JSON.parse(readFileSync(specPath, 'utf8'))

const ajv = new (Ajv as unknown as typeof Ajv.default)({ strict: false, allErrors: true })
;(addFormats as unknown as typeof addFormats.default)(ajv)
// Register every component schema under a URI that matches its $ref.
ajv.addSchema({ $id: 'lk', components: spec.components }, 'lk')
const fix = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(fix)
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node)) out[k] = k === '$ref' && typeof v === 'string' ? v.replace(/^#/, 'lk#') : fix(v)
    return out
  }
  return node
}
ajv.removeSchema('lk')
ajv.addSchema({ $id: 'lk', components: fix(spec.components) })

export function validate(schemaName: string, value: unknown): string[] {
  const check = ajv.getSchema(`lk#/components/schemas/${schemaName}`)
  if (!check) throw new Error(`unknown schema ${schemaName}`)
  if (check(value)) return []
  return (check.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`)
}

export const schemaNames = Object.keys(spec.components.schemas)
export { spec }
