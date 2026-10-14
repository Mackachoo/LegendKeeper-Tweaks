import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const project = await lk.project()
console.log(project.id, project.name, project.isPublic)

const listed = await lk.projects.list()
console.log(listed.data.length, listed.data[0]?.id === project.id)

const fetched = await lk.projects.get({ projectId: project.id })
console.log(fetched.createdAt)
