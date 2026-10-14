import { LegendKeeper, NotFoundError } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const project = await lk.project()

type CalendarList = { data: { id: string; name?: string }[] }
const calendars = await lk.request<CalendarList>({
  method: 'GET',
  path: `/api/v3/projects/${project.id}/calendars`,
  headers: { 'x-request-id': 'guide-escape-hatch' },
})
console.log(calendars.data.length, 'calendars')

const created = await lk.request<{ id: string; name: string }>({
  method: 'POST',
  path: `/api/v3/projects/${project.id}/resources`,
  body: { name: 'The Tree Fort' },
})
await lk.request({ method: 'DELETE', path: `/api/v3/projects/${project.id}/resources/${created.id}` })

try {
  await lk.request({ method: 'GET', path: `/api/v3/projects/${project.id}/resources/${created.id}` })
} catch (error) {
  if (!(error instanceof NotFoundError)) throw error
  console.log(`deleted: ${error.code}`)
}
