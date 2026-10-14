import { LegendKeeper, ValidationError, VersionMismatchError, type components } from '@legendkeeper/sdk'

type CalendarSpec = components['schemas']['CalendarSpec']

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const month = (id: string, name: string, length: number) => ({ id, name, isIntercalary: false, length, interval: 1, offset: 0 })

const spec: CalendarSpec = {
  name: 'The Calendar of Ooo',
  description: 'Four kingdom months of thirty days and the five-day Mathematical festival, counted from the Great Mushroom War.',
  hasZeroYear: false,
  maxMinutes: 1_800_000_000,
  months: [
    month('candy', 'Candy', 30),
    month('ice', 'Ice', 30),
    month('flame', 'Flame', 30),
    month('lumpy-space', 'Lumpy Space', 30),
    { ...month('mathematical', 'Mathematical', 5), isIntercalary: true },
  ],
  leapDays: [
    { id: 'gunter-day', name: 'Gunter Day', intercalary: false, month: 3, addsWeekDay: false, day: 1, weekDay: '', interval: '4', offset: 0 },
  ],
  weekdays: [
    { id: 'finn', name: 'Finnsday' },
    { id: 'jake', name: 'Jakesday' },
    { id: 'bubblegum', name: 'Bubblegumsday' },
    { id: 'marceline', name: 'Marcelinesday' },
    { id: 'bmo', name: 'BMOsday' },
  ],
  epochWeekday: 0,
  weekResetsEachMonth: false,
  hoursInDay: 24,
  minutesInHour: 60,
  negativeEra: { id: 'before-war', name: 'Before the Mushroom War', abbr: 'BMW', hideAbbr: false, startsAt: -180_000_000, resetMode: 'none' },
  positiveEras: [{ id: 'after-war', name: 'After the Mushroom War', abbr: 'AMW', hideAbbr: false, startsAt: 0, resetMode: 'none' }],
  moons: [{ id: 'the-moon', name: 'The Moon', phase: 40_320, shift: 0, color: '#E8E4D8' }],
  format: { id: 'ooo', year: 'YYYY E', month: 'MMMM YYYY E', day: 'MMMM D^, YYYY E', time: 'MMMM D^, YYYY E, HH:mm' },
  halfClock: false,
}

const calendar = await lk.calendars.create(spec)
let version = calendar.version
const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
try {
  const timeline = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }

  const lane = await lk.timelines.createLane(timeline, { name: 'Kingdoms', rank: 'a0', size: 'lg' })
  await lk.documents.update(timeline, { calendarId: calendar.id })
  console.log((await lk.documents.get(timeline)).calendarId === calendar.id)
  await lk.timelines.createEvent(timeline, { laneId: lane.id, type: 'event', name: 'Princess Bubblegum makes the first Candy Person', formattedStart: '200 AMW' })
  await lk.timelines.createEvent(timeline, { laneId: lane.id, type: 'event', name: 'Finn is found in the woods', formattedStart: 'Flame 14th, 1016 AMW' })
  for await (const event of await lk.timelines.listEvents(timeline)) {
    const { day, monthName, year, era } = event.startDate
    console.log(event.formattedStart, event.name, '|', day, monthName, year, era.abbr)
  }

  const renamed = await lk.calendars.update({ calendarId: calendar.id }, { ...spec, name: 'The Ooo Reckoning', ifMatch: version })
  version = renamed.version
  try {
    await lk.calendars.update({ calendarId: calendar.id }, { ...spec, ifMatch: calendar.version })
  } catch (error) {
    if (!(error instanceof VersionMismatchError)) throw error
    console.log(`stale version refused: ${error.code}`)
  }

  try {
    await lk.calendars.update({ calendarId: 'gregorian' }, spec)
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    console.log(`built-in calendars cannot change: ${error.code}`)
  }

  await lk.documents.update(timeline, { calendarId: 'harptos' })
  for await (const event of await lk.timelines.listEvents(timeline)) console.log(event.formattedStart, event.name)
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
  await lk.calendars.delete({ calendarId: calendar.id }, { ifMatch: version })
}
