import { LegendKeeper, RateLimitError } from '@legendkeeper/sdk'

const maxRetries = 4

const lk = new LegendKeeper({
  apiKey: process.env.LEGENDKEEPER_API_KEY!,
  maxRetries,
  fetch: async (url, init) => {
    const response = await fetch(url, init)
    const remaining = response.headers.get('x-ratelimit-remaining')
    const reset = response.headers.get('x-ratelimit-reset')
    if (remaining !== null && reset !== null) {
      console.log(`${remaining} left in the window that resets at ${new Date(Number(reset) * 1000).toISOString()}`)
    }
    return response
  },
})

try {
  const page = await lk.resources.list({ limit: 5 })
  console.log(`read ${page.data.length} resources`)
} catch (error) {
  if (!(error instanceof RateLimitError)) throw error
  console.log(`still limited after ${maxRetries} retries; the server asks for ${error.retryAfterMs} ms`)
}
