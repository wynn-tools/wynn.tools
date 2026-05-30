import type { Map as LMap } from 'leaflet'
import type { Container } from 'pixi.js'
import type { SearchIngredient } from '~/lib/items-search/types'
import { worldToLatLng } from '~/composables/useMapProjection'

const PALETTE_CSS = [
  '#E05C5C',
  '#5C9EE0',
  '#5CE07A',
  '#E0C45C',
  '#C05CE0',
  '#5CD4E0',
  '#E08C5C',
  '#9EE05C',
]

export function computeMobPalette(ingredient: SearchIngredient): Map<string, string> {
  const palette = new Map<string, string>()
  let idx = 0
  for (const mob of ingredient.droppedBy) {
    if (!palette.has(mob.name))
      palette.set(mob.name, PALETTE_CSS[idx++ % PALETTE_CSS.length]!)
  }
  return palette
}

export async function renderIngredientDrops(
  map: LMap,
  container: Container,
  ingredient: SearchIngredient | null,
): Promise<Map<string, string>> {
  const { Graphics } = await import('pixi.js')
  container.removeChildren().forEach(c => c.destroy({ children: true }))

  if (!ingredient)
    return new Map()

  const palette = computeMobPalette(ingredient)

  for (const mob of ingredient.droppedBy) {
    if (!mob.coords)
      continue
    const cssColor = palette.get(mob.name)!
    const pixiColor = Number.parseInt(cssColor.slice(1), 16)

    for (const [x, , z] of mob.coords) {
      const ll = worldToLatLng({ x, z })
      const pt = map.latLngToContainerPoint([ll.lat, ll.lng])

      const g = new Graphics()
      ;(g as any).__wx = x
      ;(g as any).__wz = z

      g.setFillStyle({ color: pixiColor, alpha: 0.4 })
      g.circle(0, 0, 8)
      g.fill()
      g.setStrokeStyle({ width: 1.5, color: pixiColor, alpha: 1 })
      g.circle(0, 0, 8)
      g.stroke()

      g.position.set(pt.x, pt.y)
      container.addChild(g)
    }
  }

  return palette
}

export function repositionIngredientDrops(map: LMap, container: Container) {
  for (const child of container.children) {
    const g = child as any
    if (g.__wx === undefined)
      continue
    const ll = worldToLatLng({ x: g.__wx, z: g.__wz })
    const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
    child.position.set(pt.x, pt.y)
  }
}

export function fitIngredientDrops(map: LMap, ingredient: SearchIngredient) {
  const xs: number[] = []
  const zs: number[] = []
  for (const mob of ingredient.droppedBy) {
    if (!mob.coords)
      continue
    for (const [x, , z] of mob.coords) {
      xs.push(x)
      zs.push(z)
    }
  }
  if (!xs.length)
    return

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)

  map.flyToBounds(
    [[-maxZ, minX], [-minZ, maxX]],
    { padding: [80, 80], duration: 0.6 },
  )
}
