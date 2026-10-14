#!/usr/bin/env node
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerTools, SERVER_INSTRUCTIONS } from './tools.js'
import { loadConfig, type Config } from './world.js'

export const VERSION = '0.1.0'

export function buildServer(config: Config): McpServer {
  const server = new McpServer(
    { name: 'legendkeeper', title: 'LegendKeeper', version: VERSION },
    { instructions: SERVER_INSTRUCTIONS + (config.readOnly ? '\nThis server is in read-only mode: no write tools are available.' : '') },
  )
  registerTools(server, config)
  return server
}

const log = (...args: unknown[]) => console.error('[legendkeeper-mcp]', ...args)

function sameToken(given: string, expected: string) {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function readJson(req: IncomingMessage, limit = 4 * 1024 * 1024): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > limit) throw Object.assign(new Error('Request body too large'), { status: 413 })
    chunks.push(chunk as Buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : undefined
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...headers }).end(JSON.stringify(body))
}

export function startHttp(config: Config, options: { port: number; host: string; token?: string; path: string }) {
  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true, version: VERSION, worlds: config.worlds.map((w) => w.slug) })
    if (url.pathname !== options.path) return sendJson(res, 404, { error: 'not found' })

    if (options.token) {
      const auth = req.headers.authorization ?? ''
      const given = /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim() ?? ''
      if (!given || !sameToken(given, options.token)) {
        return sendJson(res, 401, { jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null }, { 'www-authenticate': 'Bearer' })
      }
    }
    if (req.method !== 'POST') {
      // Stateless server: no server-initiated streams and no sessions to delete.
      return sendJson(res, 405, { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null }, { allow: 'POST' })
    }
    let body: unknown
    try {
      body = await readJson(req)
    } catch (error) {
      const status = (error as { status?: number }).status ?? 400
      return sendJson(res, status, { jsonrpc: '2.0', error: { code: -32700, message: (error as Error).message }, id: null })
    }
    const server = buildServer(config)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    res.on('close', () => {
      void transport.close()
      void server.close()
    })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, body)
    } catch (error) {
      log('request failed', error)
      if (!res.headersSent) sendJson(res, 500, { jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null })
    }
  })
  httpServer.listen(options.port, options.host, () => {
    log(`HTTP transport on http://${options.host}:${options.port}${options.path} for worlds: ${config.worlds.map((w) => w.slug).join(', ')}${config.readOnly ? ' (read-only)' : ''}`)
  })
  return httpServer
}

async function main() {
  const config = loadConfig()
  const transport = (process.env.MCP_TRANSPORT ?? (process.argv.includes('--http') ? 'http' : 'stdio')).toLowerCase()
  if (transport === 'http') {
    const token = process.env.MCP_AUTH_TOKEN?.trim()
    if (!token && !/^(1|true|yes)$/i.test(process.env.MCP_ALLOW_NO_AUTH ?? '')) {
      throw new Error('MCP_AUTH_TOKEN is required for the HTTP transport (or set MCP_ALLOW_NO_AUTH=1 on a private network).')
    }
    if (token && token.length < 24) throw new Error('MCP_AUTH_TOKEN should be at least 24 characters. Generate one with: openssl rand -hex 32')
    startHttp(config, {
      port: Number(process.env.PORT ?? 8787),
      host: process.env.HOST ?? '0.0.0.0',
      path: process.env.MCP_PATH ?? '/mcp',
      ...(token ? { token } : {}),
    })
  } else {
    const server = buildServer(config)
    await server.connect(new StdioServerTransport())
    log(`stdio transport ready for worlds: ${config.worlds.map((w) => w.slug).join(', ')}${config.readOnly ? ' (read-only)' : ''}`)
  }
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href
if (isMain || process.env.LEGENDKEEPER_MCP_MAIN === '1') {
  main().catch((error) => {
    log(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
