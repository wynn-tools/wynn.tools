import type { SearchCharm, WynnIcon } from './types'

interface RawCharm {
  id: number
  name: string
  displayName: string
  tier: string
  emblem: string
  requirements?: { level?: number }
  icon?: WynnIcon | null
  base?: Record<string, { min: number, max: number, raw: number }>
  identifications?: Record<string, { min: number, max: number, raw: number }>
}

interface RawCharmFile { charms: RawCharm[] }

export function adaptSearchCharms(file: RawCharmFile): SearchCharm[] {
  return file.charms.map(c => ({
    id: c.id,
    name: c.name,
    displayName: c.displayName,
    tier: c.tier,
    level: c.requirements?.level ?? 0,
    emblem: c.emblem,
    icon: c.icon ?? null,
    base: c.base ?? {},
    identifications: c.identifications ?? {},
  }))
}
