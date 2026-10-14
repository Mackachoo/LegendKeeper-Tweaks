import { LegendKeeper } from '@legendkeeper/sdk'
import { keyValue, property, textField } from '@legendkeeper/sdk/blocks'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const marceline = await lk.resources.create({ name: 'Marceline the Vampire Queen' })
try {
  const sidebar = { resourceId: marceline.id }

  const stats = await lk.properties.create(sidebar, property(keyValue([['Age', 'Over a thousand']]), { title: 'Stats' }))
  const bio = await lk.properties.create(sidebar, {
    ...property(textField('Eats the color red. Plays an axe bass that used to be her family’s heirloom axe.'), { title: 'Bio' }),
    before: stats.id,
  })
  if (!stats.id || !bio.id) throw new Error('a new property has no id')

  await lk.properties.update({ ...sidebar, propertyId: bio.id }, { title: 'Lore', isHidden: true })
  const lore = await lk.properties.get({ ...sidebar, propertyId: bio.id })
  console.log(lore.title, lore.isHidden)

  const rows = { ...sidebar, propertyId: stats.id }
  const dad = await lk.properties.createRow(rows, { key: 'Dad', text: 'Hunson Abadeer' })
  if (!dad.id) throw new Error('the new row has no id')
  await lk.properties.updateRow({ ...rows, rowId: dad.id }, { key: 'Father' })
  for (const row of (await lk.properties.listRows(rows)).data) console.log(`${row.key}: ${row.text}`)
  await lk.properties.deleteRow({ ...rows, rowId: dad.id })

  await lk.properties.delete({ ...sidebar, propertyId: bio.id })
  for (const item of (await lk.properties.list(sidebar)).data) console.log(item.kind, item.title, item.rank)
} finally {
  await lk.resources.delete({ resourceId: marceline.id })
}
