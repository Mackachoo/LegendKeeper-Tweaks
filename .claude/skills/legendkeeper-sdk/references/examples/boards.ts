import { LegendKeeper } from '@legendkeeper/sdk'

const lk = new LegendKeeper({ apiKey: process.env.LEGENDKEEPER_API_KEY! })

const ooo = await lk.resources.create({ name: 'The Land of Ooo' })
try {
  const board = { resourceId: ooo.id, documentId: ooo.documents[0]!.id }

  const empty = await lk.boards.getContent(board)
  console.log(empty.pages.map((page) => page.name).join(', '), empty.shapes.length, 'shapes')

  const created = await lk.boards.createShapes(board, {
    ifMatch: empty.version,
    shapes: [
      { id: 'shape:candy-kingdom', type: 'geo', x: 0, y: 0, props: { w: 220, h: 120, text: 'Candy Kingdom', color: 'violet', fill: 'solid' } },
      { id: 'shape:ice-kingdom', type: 'geo', x: 480, y: 0, props: { w: 220, h: 120, text: 'Ice Kingdom', color: 'light-blue', fill: 'solid' } },
      { id: 'shape:rivalry', type: 'arrow', props: { text: 'kidnaps princesses from' } },
      { type: 'note', x: 0, y: 220, props: { text: 'Gunter was last seen here' } },
    ],
    bindings: [
      { type: 'arrow', fromId: 'shape:rivalry', toId: 'shape:ice-kingdom', props: { terminal: 'start' } },
      { type: 'arrow', fromId: 'shape:rivalry', toId: 'shape:candy-kingdom', props: { terminal: 'end' } },
    ],
  })
  console.log(created.shapes.length, 'shapes and', created.bindings.length, 'bindings')

  const updated = await lk.boards.updateShapes(board, { ifMatch: created.version, shapes: [{ id: 'shape:ice-kingdom', y: 60, props: { color: 'blue' } }] })

  const deleted = await lk.boards.deleteShapes(board, { ids: ['shape:rivalry'], ifMatch: updated.version })
  console.log('deleted', deleted.shapeIds.join(', '), 'and', deleted.bindingIds.length, 'bindings')

  const shapes = await lk.boards.listShapes(board)
  console.log(shapes.data.map((shape) => `${shape.type} at ${shape.x},${shape.y}`).join('\n'))

  const replaced = await lk.boards.replaceContent(board, {
    ifMatch: deleted.version,
    shapes: [{ type: 'text', x: 0, y: 0, props: { text: 'The Land of Ooo' } }],
  })
  console.log(replaced.shapes.length, 'shape after the replace')
} finally {
  await lk.resources.delete({ resourceId: ooo.id })
}
