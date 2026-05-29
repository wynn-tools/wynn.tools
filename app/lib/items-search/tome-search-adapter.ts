import type { DropMeta, SearchTome, WynnIcon } from './types'

interface RawTome {
  id: number
  name: string
  displayName?: string
  type: string
  tier: string
  requirements?: { level?: number }
  identifications?: Record<string, { min: number, max: number, raw: number }>
  emblem?: string | null
  icon?: WynnIcon | null
  dropMeta?: DropMeta | null
}

interface RawTomeFile { tomes: RawTome[] }

export function adaptSearchTomes(file: RawTomeFile): SearchTome[] {
  return file.tomes.map(t => ({
    id: t.id,
    name: t.name,
    displayName: t.displayName ?? t.name,
    type: t.type,
    tier: t.tier,
    level: t.requirements?.level ?? 0,
    identifications: t.identifications ?? {},
    emblem: t.emblem ?? null,
    icon: t.icon ?? null,
    dropMeta: t.dropMeta ?? null,
  }))
}
