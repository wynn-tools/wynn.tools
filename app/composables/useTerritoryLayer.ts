import type { Map as LMap } from 'leaflet'
import type { Container, Graphics as PixiGraphics, Text as PixiText } from 'pixi.js'
import type { TerritoryEntry } from '~/types/map'

interface TerritoryItem {
  territory: TerritoryEntry
  g: PixiGraphics
}

export interface TerritoryLayerHandle {
  items: TerritoryItem[]
}

function hexColor(color: string): number {
  if (!color.startsWith('#'))
    return 0x888888
  return Number.parseInt(color.slice(1), 16)
}

function projectRect(
  map: LMap,
  t: TerritoryEntry,
): { screenX: number, screenY: number, w: number, h: number } {
  const sw = map.latLngToContainerPoint([-t.startZ, t.startX])
  const ne = map.latLngToContainerPoint([-t.endZ, t.endX])
  return {
    screenX: Math.min(sw.x, ne.x),
    screenY: Math.min(sw.y, ne.y),
    w: Math.abs(ne.x - sw.x),
    h: Math.abs(ne.y - sw.y),
  }
}

export async function attachTerritoryLayer(
  map: LMap,
  container: Container,
  territories: TerritoryEntry[],
  onTerritoryClick: (territory: TerritoryEntry, screenPos: { x: number, y: number }) => void,
): Promise<TerritoryLayerHandle> {
  const { Graphics, Text } = await import('pixi.js')
  container.removeChildren().forEach(c => c.destroy({ children: true }))
  const items: TerritoryItem[] = []

  for (const t of territories) {
    const color = t.guild?.color ?? '#888888'
    const colorNum = hexColor(color)

    const { screenX, screenY, w, h } = projectRect(map, t)

    const g = new Graphics()
    g.rect(0, 0, w, h).fill({ color: colorNum, alpha: 0.35 }).stroke({ color: colorNum, alpha: 0.8, width: 1 })
    g.position.set(screenX, screenY)
    g.eventMode = 'static'
    g.cursor = 'pointer'
    g.on('pointertap', (e) => {
      e.stopPropagation()
      e.nativeEvent?.stopPropagation()
      onTerritoryClick(t, { x: e.global.x, y: e.global.y })
    })

    if (t.guild) {
      const label = new Text({
        text: `[${t.guild.prefix}]`,
        style: {
          fill: color,
          fontSize: 11,
          fontFamily: 'sans-serif',
          stroke: { color: '#000000', width: 3 },
          align: 'center',
        },
      })
      label.anchor.set(0.5)
      label.position.set(w / 2, h / 2)
      label.eventMode = 'none'
      g.addChild(label)
    }

    container.addChild(g)
    items.push({ territory: t, g })
  }

  return { items }
}

export function repositionTerritoryLayer(map: LMap, handle: TerritoryLayerHandle): void {
  for (const item of handle.items) {
    const t = item.territory
    const color = t.guild?.color ?? '#888888'
    const colorNum = hexColor(color)
    const { screenX, screenY, w, h } = projectRect(map, t)

    item.g.clear()
    item.g.rect(0, 0, w, h).fill({ color: colorNum, alpha: 0.35 }).stroke({ color: colorNum, alpha: 0.8, width: 1 })
    item.g.position.set(screenX, screenY)

    if (item.g.children.length > 0) {
      const label = item.g.children[0] as PixiText
      label.position.set(w / 2, h / 2)
    }
  }
}

export function detachTerritoryLayer(container: Container): void {
  container.removeChildren().forEach(c => c.destroy({ children: true }))
}
