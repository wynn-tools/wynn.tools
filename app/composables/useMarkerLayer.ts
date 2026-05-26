import type { Map as LMap } from 'leaflet'
import type { Container, Sprite } from 'pixi.js'
import type { ClusterPoint } from '~/composables/useClustering'
import type { MapCategoryId, MapFeature, WorldId } from '~/types/map'
import { clusterByScreenDistance } from '~/composables/useClustering'
import { getResolvedLevel } from '~/composables/useLevelIndex'
import { worldToLatLng } from '~/composables/useMapProjection'
import { getCachedTextures } from '~/composables/usePixiTextures'
import { getCategory } from '~/config/categories'

export function shouldRenderMarker(
  f: MapFeature,
  ctx: {
    activeWorld: WorldId
    enabledCategories: MapCategoryId[]
    zoom: number
    levelRange?: [number, number] | null
  },
): boolean {
  if (f.worldId !== ctx.activeWorld)
    return false
  if (!ctx.enabledCategories.includes(f.categoryId))
    return false
  const cat = getCategory(f.categoryId)
  if (!cat)
    return false
  if (ctx.zoom < cat.minZoom)
    return false
  if (ctx.levelRange) {
    const [lo, hi] = ctx.levelRange
    const level = getResolvedLevel(f.featureId)
    if (level !== undefined && (level < lo || level > hi))
      return false
  }
  return true
}

export interface MarkerLayerCtx {
  activeWorld: WorldId
  enabledCategories: MapCategoryId[]
  zoom: number
  levelRange?: [number, number] | null
}

export async function renderMarkers(
  map: LMap,
  container: Container,
  features: MapFeature[],
  ctx: MarkerLayerCtx,
  onClick?: (featureId: string, screenPos: { x: number, y: number }) => void,
): Promise<Map<string, Sprite>> {
  const { Sprite } = await import('pixi.js')
  container.removeChildren()
  const out = new Map<string, Sprite>()
  const textures = getCachedTextures()
  if (!textures)
    return out

  for (const f of features) {
    if (!shouldRenderMarker(f, ctx))
      continue
    const cat = getCategory(f.categoryId)
    if (cat?.cluster)
      continue // handled by renderClusters
    const tex = textures.get(f.categoryId)
    if (!tex)
      continue
    const s = new Sprite(tex)
    s.anchor.set(0.5)
    positionSprite(s, f, map)
    const targetPx = clamp(12 + ctx.zoom * 4, 24, 64)
    const maxDim = Math.max(tex.width, tex.height)
    s.scale.set(targetPx / maxDim)
    s.eventMode = 'static'
    s.cursor = 'pointer'
    if (onClick) {
      s.on('pointertap', (e) => {
        e.stopPropagation()
        e.nativeEvent?.stopPropagation()
        onClick(f.featureId, { x: e.global.x, y: e.global.y })
      })
    }
    ;(s as any).featureId = f.featureId
    container.addChild(s)
    out.set(f.featureId, s)
  }
  return out
}

function positionSprite(s: Sprite, f: MapFeature, map: LMap) {
  const ll = worldToLatLng(f.location)
  const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
  s.position.set(pt.x, pt.y)
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function rerenderPositions(
  map: LMap,
  sprites: Map<string, Sprite>,
  features: MapFeature[],
) {
  const byId = new Map(features.map(f => [f.featureId, f]))
  for (const [id, s] of sprites) {
    const f = byId.get(id)
    if (!f)
      continue
    positionSprite(s, f, map)
  }
}

export async function renderClusters(
  map: LMap,
  container: Container,
  features: MapFeature[],
  ctx: MarkerLayerCtx,
  onFeatureClick?: (featureId: string, screenPos: { x: number, y: number }) => void,
  onClusterClick?: (worldX: number, worldZ: number) => void,
) {
  const { Graphics, Text, Sprite, Container: PixiContainer } = await import('pixi.js')
  container.removeChildren().forEach(c => c.destroy({ children: true }))
  const textures = getCachedTextures()

  type AnnotatedPoint = ClusterPoint & { feature: MapFeature }
  const pts: AnnotatedPoint[] = []
  for (const f of features) {
    if (!shouldRenderMarker(f, ctx))
      continue
    const cat = getCategory(f.categoryId)
    if (!cat?.cluster)
      continue
    const ll = worldToLatLng(f.location)
    const pt = map.latLngToContainerPoint([ll.lat, ll.lng])
    pts.push({ id: f.featureId, x: pt.x, y: pt.y, cat: f.categoryId, feature: f })
  }

  const groups = clusterByScreenDistance(pts, 32)
  for (const g of groups) {
    const members = g.members as AnnotatedPoint[]

    if (members.length < 2) {
      // Singleton: render as an individual sprite (same sizing as renderMarkers)
      const f = members[0].feature
      const tex = textures?.get(f.categoryId)
      if (!tex)
        continue
      const s = new Sprite(tex)
      s.anchor.set(0.5)
      s.position.set(members[0].x, members[0].y)
      const targetPx = clamp(12 + ctx.zoom * 4, 24, 64)
      s.scale.set(targetPx / Math.max(tex.width, tex.height))
      s.eventMode = 'static'
      s.cursor = 'pointer'
      if (onFeatureClick) {
        s.on('pointertap', (e) => {
          e.stopPropagation()
          e.nativeEvent?.stopPropagation()
          onFeatureClick(f.featureId, { x: e.global.x, y: e.global.y })
        })
      }
      container.addChild(s)
      continue
    }

    // Group: category icon + count badge
    const avgX = members.reduce((s, p) => s + p.feature.location.x, 0) / members.length
    const avgZ = members.reduce((s, p) => s + p.feature.location.z, 0) / members.length

    const tex = textures?.get(members[0].feature.categoryId)
    if (!tex)
      continue

    const targetPx = clamp(12 + ctx.zoom * 4, 24, 64)
    const badgeR = Math.max(7, Math.min(10, 7 + String(members.length).length))
    const countStr = members.length > 99 ? '99+' : String(members.length)

    const group = new PixiContainer()
    group.position.set(g.cx, g.cy)

    const icon = new Sprite(tex)
    icon.anchor.set(0.5)
    icon.scale.set(targetPx / Math.max(tex.width, tex.height))
    group.addChild(icon)

    const badge = new Graphics()
    badge.circle(0, 0, badgeR).fill({ color: 0xC47B3A }).stroke({ color: 0x1B2432, width: 1.5 })
    badge.position.set(targetPx / 2 - badgeR / 2, targetPx / 2 - badgeR / 2)

    const badgeLabel = new Text({
      text: countStr,
      style: { fontSize: badgeR - 1, fill: 0x1B2432, fontWeight: 'bold' },
    })
    badgeLabel.anchor.set(0.5)
    badge.addChild(badgeLabel)
    group.addChild(badge)

    group.eventMode = 'static'
    group.cursor = 'pointer'
    if (onClusterClick) {
      group.on('pointertap', (e) => {
        e.stopPropagation()
        e.nativeEvent?.stopPropagation()
        onClusterClick(avgX, avgZ)
      })
    }
    container.addChild(group)
  }
}
