import type { Texture } from 'pixi.js'
import { CATEGORIES } from '~/config/categories'

let cache: Map<string, Texture> | null = null

export async function loadCategoryTextures(): Promise<Map<string, Texture>> {
  if (cache)
    return cache
  const { Assets } = await import('pixi.js')
  const unique = [...new Set(CATEGORIES.map(c => c.icon))]
  const loaded = await Assets.load(unique)
  cache = new Map()
  for (const c of CATEGORIES) {
    const tex: Texture = loaded[c.icon]
    tex.source.scaleMode = 'nearest'
    cache.set(c.id, tex)
  }
  return cache
}

export function getCachedTextures(): Map<string, Texture> | null {
  return cache
}
