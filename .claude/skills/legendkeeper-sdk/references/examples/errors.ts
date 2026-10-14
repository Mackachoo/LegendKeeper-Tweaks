import { ConnectionError, LegendKeeper, LegendKeeperError, NotFoundError, ValidationError } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

async function report(attempt: () => Promise<unknown>): Promise<void> {
  try {
    await attempt()
    console.log('succeeded')
  } catch (error) {
    if (error instanceof ValidationError) {
      for (const issue of error.errors ?? []) console.log(`${error.code} at ${issue.path}: ${issue.message}`)
    } else if (error instanceof NotFoundError) {
      console.log(`${error.code}: ${error.message}`)
    } else if (error instanceof LegendKeeperError) {
      console.log(`${error.status} ${error.code ?? 'an unknown code'}; quote request ${error.requestId}`)
    } else if (error instanceof ConnectionError) {
      console.log(`no response: ${error.message}`)
    } else {
      throw error
    }
  }
}

await report(() => lk.resources.create({ name: '' }))
await report(() => lk.resources.list({ limit: 500 }))
await report(() => lk.resources.get({ resourceId: 'no-such-resource' }))
