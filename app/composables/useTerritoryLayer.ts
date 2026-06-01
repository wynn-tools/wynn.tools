import type { Map as LMap } from 'leaflet'
import type { Container, Graphics as PixiGraphics, Sprite as PixiSprite, Text as PixiText, Texture } from 'pixi.js'
import type { TerritoryEntry } from '~/types/map'

interface TerritoryItem {
  territory: TerritoryEntry
  g: PixiGraphics
}

// 16x13 gold crown — mirrors Wynntils' Texture.GUILD_HEADQUARTERS, drawn instead
// of the guild prefix on HQ territories.
const HQ_ICON_URL = 'https://cdn.wynn.tools/icons/map/guild_headquarters.png'
let hqTexturePromise: Promise<Texture> | null = null
async function getHqTexture(): Promise<Texture> {
  if (!hqTexturePromise) {
    const { Assets } = await import('pixi.js')
    hqTexturePromise = Assets.load(HQ_ICON_URL) as Promise<Texture>
  }
  return hqTexturePromise
}

export interface TerritoryLayerHandle {
  items: TerritoryItem[]
  byName: Map<string, TerritoryItem>
  linesG: PixiGraphics
  selectedName: string | null
  hoveredLinkName: string | null
}

const LINE_COLOR = 0x0A0A14
const LINE_HIGHLIGHT_COLOR = 0x3FA8FF

// Arc Blue tokens — kept in hex form for Pixi which needs numeric colors.
// These intentionally mirror --color-accent / --color-accent-dim (dark theme).
const SELECTED_COLOR = 0x3FA8FF
const HOVER_LINK_COLOR = 0x4B8FD9

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

function centerOf(map: LMap, t: TerritoryEntry): { x: number, y: number } {
  const a = map.latLngToContainerPoint([-t.startZ, t.startX])
  const b = map.latLngToContainerPoint([-t.endZ, t.endX])
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function drawConnectionLines(map: LMap, handle: TerritoryLayerHandle): void {
  const g = handle.linesG
  g.clear()
  const seen = new Set<string>()
  const highlighted: Array<{ ax: number, ay: number, bx: number, by: number }> = []
  const selected = handle.selectedName
  for (const item of handle.items) {
    const t = item.territory
    const links = t.links
    if (!links || links.length === 0)
      continue
    const a = centerOf(map, t)
    for (const otherName of links) {
      const pair = t.name < otherName ? `${t.name}|${otherName}` : `${otherName}|${t.name}`
      if (seen.has(pair))
        continue
      seen.add(pair)
      const other = handle.byName.get(otherName)
      if (!other)
        continue
      const b = centerOf(map, other.territory)
      if (selected && (selected === t.name || selected === otherName)) {
        highlighted.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y })
        continue
      }
      g.moveTo(a.x, a.y).lineTo(b.x, b.y)
    }
  }
  g.stroke({ color: LINE_COLOR, alpha: 0.7, width: 1 })

  if (highlighted.length > 0) {
    for (const seg of highlighted)
      g.moveTo(seg.ax, seg.ay).lineTo(seg.bx, seg.by)
    g.stroke({ color: LINE_HIGHLIGHT_COLOR, alpha: 0.95, width: 1.5 })
  }
}

function drawTerritory(
  g: PixiGraphics,
  t: TerritoryEntry,
  w: number,
  h: number,
  state: 'normal' | 'selected' | 'hover-link',
): void {
  const baseColor = hexColor(t.guild?.color ?? '#888888')
  g.clear()
  if (state === 'selected') {
    g.rect(0, 0, w, h)
      .fill({ color: baseColor, alpha: 0.45 })
      .stroke({ color: SELECTED_COLOR, alpha: 1, width: 2 })
  }
  else if (state === 'hover-link') {
    g.rect(0, 0, w, h)
      .fill({ color: baseColor, alpha: 0.4 })
      .stroke({ color: HOVER_LINK_COLOR, alpha: 0.9, width: 2 })
  }
  else {
    g.rect(0, 0, w, h)
      .fill({ color: baseColor, alpha: 0.35 })
      .stroke({ color: baseColor, alpha: 0.8, width: 1 })
  }
}

function stateFor(
  name: string,
  selectedName: string | null,
  hoveredLinkName: string | null,
): 'normal' | 'selected' | 'hover-link' {
  if (selectedName === name)
    return 'selected'
  if (hoveredLinkName === name)
    return 'hover-link'
  return 'normal'
}

export async function attachTerritoryLayer(
  map: LMap,
  container: Container,
  territories: TerritoryEntry[],
  onTerritoryClick: (territory: TerritoryEntry, screenPos: { x: number, y: number }) => void,
): Promise<TerritoryLayerHandle> {
  const { Graphics, Sprite, Text } = await import('pixi.js')
  const hqTex = await getHqTexture()
  container.removeChildren().forEach(c => c.destroy({ children: true }))
  const items: TerritoryItem[] = []
  const byName = new Map<string, TerritoryItem>()

  // Lines drawn underneath polygons.
  const linesG = new Graphics()
  linesG.eventMode = 'none'
  container.addChild(linesG)

  for (const t of territories) {
    const color = t.guild?.color ?? '#888888'
    const { screenX, screenY, w, h } = projectRect(map, t)

    const g = new Graphics()
    drawTerritory(g, t, w, h, 'normal')
    g.position.set(screenX, screenY)
    g.eventMode = 'static'
    g.cursor = 'pointer'
    g.on('pointertap', (e) => {
      e.stopPropagation()
      e.nativeEvent?.stopPropagation()
      onTerritoryClick(t, { x: e.global.x, y: e.global.y })
    })

    if (t.guild) {
      if (t.hq) {
        const crown = new Sprite(hqTex)
        crown.anchor.set(0.5)
        crown.position.set(w / 2, h / 2)
        crown.eventMode = 'none'
        g.addChild(crown)
      }
      else {
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
    }

    container.addChild(g)
    const item: TerritoryItem = { territory: t, g }
    items.push(item)
    byName.set(t.name, item)
  }

  const handle: TerritoryLayerHandle = {
    items,
    byName,
    linesG,
    selectedName: null,
    hoveredLinkName: null,
  }
  drawConnectionLines(map, handle)
  return handle
}

export function setTerritoryHighlight(
  map: LMap,
  handle: TerritoryLayerHandle,
  opts: { selected?: string | null, hoveredLink?: string | null },
): void {
  const prevSelected = handle.selectedName
  const prevHover = handle.hoveredLinkName
  if (opts.selected !== undefined)
    handle.selectedName = opts.selected
  if (opts.hoveredLink !== undefined)
    handle.hoveredLinkName = opts.hoveredLink

  const affected = new Set<string>()
  for (const name of [prevSelected, prevHover, handle.selectedName, handle.hoveredLinkName]) {
    if (name)
      affected.add(name)
  }
  for (const name of affected) {
    const item = handle.byName.get(name)
    if (!item)
      continue
    const { w, h } = projectRect(map, item.territory)
    drawTerritory(item.g, item.territory, w, h, stateFor(name, handle.selectedName, handle.hoveredLinkName))
  }
  if (prevSelected !== handle.selectedName)
    drawConnectionLines(map, handle)
}

export function repositionTerritoryLayer(map: LMap, handle: TerritoryLayerHandle): void {
  for (const item of handle.items) {
    const t = item.territory
    const { screenX, screenY, w, h } = projectRect(map, t)

    drawTerritory(item.g, t, w, h, stateFor(t.name, handle.selectedName, handle.hoveredLinkName))
    item.g.position.set(screenX, screenY)

    if (item.g.children.length > 0) {
      const label = item.g.children[0] as PixiText | PixiSprite
      label.position.set(w / 2, h / 2)
    }
  }
  drawConnectionLines(map, handle)
}

export function detachTerritoryLayer(container: Container): void {
  container.removeChildren().forEach(c => c.destroy({ children: true }))
}
