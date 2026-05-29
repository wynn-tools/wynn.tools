import type { SearchMaterial, WynnIcon } from './types'
import type { NormalizedText } from '~/lib/data/cdn-adapter/item-adapter'

interface RawMaterial {
  id: number
  name: string
  displayName: string
  subType: string
  requirements?: { level?: number }
  icon?: WynnIcon | null
  lore?: NormalizedText[] | null
  chances?: { tier1?: number, tier2?: number, tier3?: number }
}

interface RawMaterialFile { materials: RawMaterial[] }

export function adaptSearchMaterials(file: RawMaterialFile): SearchMaterial[] {
  return file.materials.map(m => ({
    id: m.id,
    name: m.name,
    displayName: m.displayName,
    subType: m.subType,
    level: m.requirements?.level ?? 0,
    icon: m.icon ?? null,
    lore: m.lore ?? null,
    chances: {
      tier1: m.chances?.tier1 ?? 0,
      tier2: m.chances?.tier2 ?? 0,
      tier3: m.chances?.tier3 ?? 0,
    },
  }))
}
