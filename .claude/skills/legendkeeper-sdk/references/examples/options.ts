import { ConnectionError, LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({
  apiKey: process.env.LEGENDKEEPER_API_KEY!,
  timeoutMs: 10_000,
  maxRetries: 3,
  fetch: async (url, init) => {
    const response = await fetch(url, init)
    console.log(init.method, url, response.status, response.headers.get('x-request-id'))
    return response
  },
})

const first = await lk.resources.list({ limit: 10, signal: AbortSignal.timeout(5_000) })
console.log(`${first.data.length} resources on the first page`)

const controller = new AbortController()
controller.abort()
try {
  await lk.resources.list({ signal: controller.signal })
} catch (error) {
  if (!(error instanceof ConnectionError)) throw error
  console.log(`aborted before a response arrived: ${error.message}`)
}
