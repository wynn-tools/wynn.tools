import type { Map as LMap } from 'leaflet'
import type { Container, Text } from 'pixi.js'
import type { MapCategoryId, MapFeature, WorldId } from '~/types/map'

// Matches Wynntils LabelPoi colours
const PLACE_STYLE = {
  'wynntils:place:province': {
    fill: '#00cccc',
    fontSize: 15,
    fontWeight: '700',
    // Show only when zoomed out; fade between Leaflet zoom -1 and 0
    fadeIn: -3,
    fadeOut: 0,
  },
  'wynntils:place:city': {
    fill: '#ffff00',
    fontSize: 13,
    fontWeight: '700',
    // Always show when zoomed out; fade between zoom 1 and 2
    fadeIn: -3,
    fadeOut: 2,
  },
  'wynntils:place:town-or-place': {
    fill: '#ffffff',
    fontSize: 11,
    fontWeight: '400',
    // Fade in between zoom 0 and 1; fade out between zoom 2 and 3
    fadeIn: 0,
    fadeOut: 3,
  },
} as const

function alphaForZoom(cat: keyof typeof PLACE_STYLE, zoom: number): number {
  const s = PLACE_STYLE[cat]
  if (zoom < s.fadeIn)
    return cat === 'wynntils:place:town-or-place' ? 0 : 1
  if (zoom > s.fadeOut)
    return 0
  // smooth ramp over the last zoom unit before fadeOut
  const rampStart = s.fadeOut - 1
  if (zoom > rampStart)
    return 1 - (zoom - rampStart)
  // smooth ramp in for towns
  if (cat === 'wynntils:place:town-or-place' && zoom < s.fadeIn + 1) {
    return zoom - s.fadeIn
  }
  return 1
}

const PLACE_CATEGORIES = new Set<string>(Object.keys(PLACE_STYLE))

export function isPlaceCategory(id: string): boolean {
  return PLACE_CATEGORIES.has(id)
}

export async function renderPlaceLabels(
  map: LMap,
  container: Container,
  features: MapFeature[],
  ctx: { activeWorld: WorldId, enabledCategories: MapCategoryId[], zoom: number },
  onLabelClick?: (featureId: string, screenPos: { x: number, y: number }) => void,
): Promise<void> {
  const { Text } = await import('pixi.js')
  container.removeChildren()

  for (const f of features) {
    const catKey = f.categoryId as keyof typeof PLACE_STYLE
    if (!PLACE_STYLE[catKey])
      continue
    if (f.worldId !== ctx.activeWorld)
      continue
    if (!ctx.enabledCategories.includes(f.categoryId))
      continue

    const alpha = alphaForZoom(catKey, ctx.zoom)
    if (alpha <= 0.02)
      continue

    const style = PLACE_STYLE[catKey]
    const label = new Text({
      text: f.label,
      style: {
        fill: style.fill,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontFamily: 'sans-serif',
        stroke: { color: '#000000', width: 3 },
        align: 'center',
      },
    })
    label.anchor.set(0.5)
    label.alpha = alpha
    label.eventMode = 'static'
    label.cursor = 'pointer'

    if (onLabelClick) {
      label.on('pointertap', (e) => {
        e.stopPropagation()
        e.nativeEvent?.stopPropagation()
        onLabelClick(f.featureId, { x: e.global.x, y: e.global.y })
      })
    }

    const ll = { lat: -f.location.z, lng: f.location.x }
    const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
    label.position.set(pt.x, pt.y)

    container.addChild(label)
  }
}

export function repositionPlaceLabels(
  map: LMap,
  container: Container,
  features: MapFeature[],
): void {
  const byLabel = new Map(features.map(f => [f.label, f]))
  for (const child of container.children) {
    const text = child as Text
    const f = byLabel.get(text.text as string)
    if (!f)
      continue
    const ll = { lat: -f.location.z, lng: f.location.x }
    const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
    text.position.set(pt.x, pt.y)
  }
}
