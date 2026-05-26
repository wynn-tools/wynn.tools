import type { LocationQuery } from 'vue-router'
import type { MapCategoryId, ShareView, WorldId } from '~/types/map'
import { defaultEnabledCategories } from '~/config/categories'

const VALID_WORLDS: WorldId[] = [
  'main',
  'void',
  'kos',
  'sandy',
  'wynnter',
  'apotheosis',
  'gateway',
  'rol',
  'deaths-realm',
]

export function encodeViewToQuery(v: ShareView): Record<string, string> {
  const q: Record<string, string> = {
    world: v.world,
    x: String(Math.round(v.center.x)),
    z: String(Math.round(v.center.z)),
    zoom: String(v.zoom),
  }
  if (v.cats.length)
    q.cats = v.cats.join(',')
  if (v.focus)
    q.focus = v.focus
  if (v.fs)
    q.fs = '1'
  return q
}

export function decodeQueryToView(q: LocationQuery | Record<string, string>): ShareView {
  const get = (k: string) =>
    typeof q[k] === 'string'
      ? (q[k] as string)
      : Array.isArray(q[k])
        ? (q[k] as string[])[0]
        : undefined
  const world = (
    VALID_WORLDS.includes(get('world') as WorldId) ? get('world') : 'main'
  ) as WorldId
  const x = numOr(get('x'), 477)
  const z = numOr(get('z'), -1590)
  const zoom = numOr(get('zoom'), 4)
  const catsStr = get('cats')
  const cats = catsStr ? (catsStr.split(',') as MapCategoryId[]) : defaultEnabledCategories()
  const focus = get('focus') ?? null
  const fs = get('fs') === '1'
  return { world, center: { x, z }, zoom, cats, focus, fs }
}

function numOr(v: string | undefined, d: number) {
  if (v == null)
    return d
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

const LS_KEY = 'wynntils.map.view.v1'

export function saveToLocalStorage(v: ShareView) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ version: 1, view: v }))
  }
  catch {}
}

export function loadFromLocalStorage(): ShareView | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw)
      return null
    const parsed = JSON.parse(raw)
    if (parsed.version !== 1)
      return null
    return parsed.view as ShareView
  }
  catch {
    return null
  }
}
