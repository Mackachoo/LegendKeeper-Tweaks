import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const calendars = await lk.calendars.list()
console.log(calendars.data.map((calendar) => calendar.name ?? calendar.id).join(', '))

const brothers = await lk.resources.create({ name: 'Finn and Jake' })
try {
  const timeline = { resourceId: brothers.id, documentId: brothers.documents[0]!.id }

  const finn = await lk.timelines.createLane(timeline, { name: 'Finn', rank: 'a0', size: 'lg' })
  const jake = await lk.timelines.createLane(timeline, { name: 'Jake', rank: 'a1', size: 'sm', style: { color: '#f4a300' } })
  await lk.timelines.updateLane({ ...timeline, laneId: jake.id }, { name: 'Jake the Dog' })
  console.log((await lk.timelines.getLane({ ...timeline, laneId: jake.id })).name)

  const year = 60 * 24 * 365
  const mud = await lk.timelines.createEvent(timeline, { laneId: jake.id, type: 'event', name: 'Rolls in the magic mud puddle', start: 1000 * year })
  const found = await lk.timelines.createEvent(timeline, { laneId: jake.id, type: 'event', name: 'Jake’s family finds baby Finn', start: 1016 * year })
  const heroes = await lk.timelines.createEvent(timeline, {
    laneId: finn.id,
    type: 'event',
    name: 'Adventuring out of the Tree Fort',
    start: 1028 * year,
    end: 1033 * year,
  })
  console.log(mud.formattedStart, heroes.formattedStart, heroes.formattedEnd)
  console.log(heroes.startDate.year, heroes.startDate.era.abbr, heroes.startDate.iso, heroes.endDate?.iso)

  await lk.timelines.updateEvent({ ...timeline, eventId: found.id }, { laneId: finn.id, name: 'Found in the woods by the Dogs' })
  const moved = await lk.timelines.getEvent({ ...timeline, eventId: found.id })
  console.log(moved.name, moved.laneId === finn.id)

  for await (const event of await lk.timelines.listEvents(timeline, { limit: 50 })) console.log(event.start, event.name)
  for (const lane of (await lk.timelines.listLanes(timeline)).data) console.log(lane.rank, lane.name, lane.size)

  await lk.timelines.deleteEvent({ ...timeline, eventId: mud.id })
  await lk.timelines.deleteLane({ ...timeline, laneId: jake.id })
} finally {
  await lk.resources.delete({ resourceId: brothers.id })
}
