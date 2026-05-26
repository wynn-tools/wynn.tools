import type { Map as LMap } from 'leaflet'
import type { Container } from 'pixi.js'
import type { Lootrun } from '~/types/map'
import { worldToLatLng } from '~/composables/useMapProjection'

const ARROW_SPACING_PX = 22
const ARROW_SIZE_PX = 20
const ARROW_ALPHA = 0.9
const ARROW_TINT = 0xC47B3A

let arrowTexCache: import('pixi.js').Texture | null = null

async function getArrowTex() {
  if (arrowTexCache)
    return arrowTexCache
  const { Assets } = await import('pixi.js')
  const tex = await Assets.load('/assets/lootrun/path_arrow.png')
  tex.source.scaleMode = 'nearest'
  arrowTexCache = tex
  return tex
}

let chestTexCache: import('pixi.js').Texture | null = null

async function getChestTex() {
  if (chestTexCache)
    return chestTexCache
  const { Assets } = await import('pixi.js')
  const tex = await Assets.load('/icons/map/chest_t1.png')
  tex.source.scaleMode = 'nearest'
  chestTexCache = tex
  return tex
}

export async function renderLootrun(
  map: LMap,
  container: Container,
  lr: Lootrun | null,
) {
  const { Graphics, Text, Sprite: PixiSprite } = await import('pixi.js')

  container.removeChildren()
  if (!lr || lr.points.length < 2)
    return

  const project = (p: { x: number, y: number, z: number }) => {
    const ll = worldToLatLng(p)
    return map.latLngToContainerPoint([ll.lat, ll.lng])
  }

  const step = Math.max(1, Math.floor(lr.points.length / 1000))
  const rawPts: { x: number, y: number }[] = []
  for (let i = 0; i < lr.points.length; i += step) rawPts.push(project(lr.points[i]))
  rawPts.push(project(lr.points[lr.points.length - 1]))

  const arrowPts: { x: number, y: number, angle: number }[] = []
  let accumulated = 0
  for (let i = 1; i < rawPts.length; i++) {
    const dx = rawPts[i].x - rawPts[i - 1].x
    const dy = rawPts[i].y - rawPts[i - 1].y
    const segLen = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)
    accumulated += segLen
    if (accumulated >= ARROW_SPACING_PX) {
      arrowPts.push({ x: rawPts[i].x, y: rawPts[i].y, angle })
      accumulated = 0
    }
  }
  if (rawPts.length > 1) {
    const last = rawPts[rawPts.length - 1]
    const prev = rawPts[rawPts.length - 2]
    arrowPts.push({ x: last.x, y: last.y, angle: Math.atan2(last.y - prev.y, last.x - prev.x) })
  }

  const tex = await getArrowTex()

  for (const { x, y, angle } of arrowPts) {
    const s = new PixiSprite({ texture: tex })
    s.anchor.set(0.5, 0.5)
    s.width = ARROW_SIZE_PX
    s.height = ARROW_SIZE_PX
    s.rotation = angle
    s.position.set(x, y)
    s.tint = ARROW_TINT
    s.alpha = ARROW_ALPHA
    container.addChild(s)
  }

  const startDot = new Graphics()
    .circle(0, 0, 5)
    .fill(0xE8B887)
    .stroke({ width: 2, color: 0x1B2432 })
  startDot.position.copyFrom(rawPts[0])

  const endDot = new Graphics().circle(0, 0, 5).fill(0x8A4E20).stroke({ width: 2, color: 0x1B2432 })
  endDot.position.copyFrom(rawPts[rawPts.length - 1])

  const startLabel = new Text({
    text: 'Start',
    style: { fill: 0xE8B887, fontSize: 11, fontWeight: '600' },
  })
  startLabel.anchor.set(0.5, 1.4)
  startLabel.position.copyFrom(rawPts[0])

  const endLabel = new Text({
    text: 'End',
    style: { fill: 0x8A4E20, fontSize: 11, fontWeight: '600' },
  })
  endLabel.anchor.set(0.5, 1.4)
  endLabel.position.copyFrom(rawPts[rawPts.length - 1])

  container.addChild(startDot, endDot, startLabel, endLabel)

  if (lr.chests && lr.chests.length > 0) {
    const chestTex = await getChestTex()
    const CHEST_SIZE_PX = 28
    for (const chest of lr.chests) {
      const pt = project(chest)
      const s = new PixiSprite({ texture: chestTex })
      s.anchor.set(0.5)
      s.width = CHEST_SIZE_PX
      s.height = CHEST_SIZE_PX
      s.position.set(pt.x, pt.y)
      container.addChild(s)
    }
  }
}

export function fitToLootrun(map: LMap, lr: Lootrun) {
  if (!lr.bbox)
    return
  map.flyToBounds(
    [
      [-lr.bbox.z1, lr.bbox.x1],
      [-lr.bbox.z2, lr.bbox.x2],
    ],
    { padding: [40, 40], duration: 0.6 },
  )
}
