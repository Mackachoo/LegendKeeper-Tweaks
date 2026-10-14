import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const project = await lk.project()
console.log(`Connected to ${project.name} (${project.id})`)

const resource = await lk.resources.create({ name: 'The Tree Fort' })
console.log(`Created ${resource.name} (${resource.id})`)

await lk.resources.delete({ resourceId: resource.id })
