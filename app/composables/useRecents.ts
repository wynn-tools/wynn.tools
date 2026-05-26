import type { MapFeature } from '~/types/map'

const LS_KEY = 'map:recents'
const MAX = 10

function load(): MapFeature[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as MapFeature[]) : []
  }
  catch {
    return []
  }
}

function save(items: MapFeature[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
  }
  catch {}
}

export function addRecent(feature: MapFeature) {
  const items = load().filter(f => f.featureId !== feature.featureId)
  items.unshift(feature)
  save(items.slice(0, MAX))
}

export function getRecents(): MapFeature[] {
  return load()
}
