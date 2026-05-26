import type { RawBuild } from '../codec/build-codec'
import type { BuildContext, BuildResult } from './compute-build'
import { WEP_TO_CLASS } from '../codec/wep-to-class'

export interface BuildMeta {
  level: number
  className: string
  items: Array<{ slot: string, name: string }>
  dps: number
  ehp: number
}

const SLOT_LABELS = [
  'Helmet',
  'Chestplate',
  'Leggings',
  'Boots',
  'Ring 1',
  'Ring 2',
  'Bracelet',
  'Necklace',
  'Weapon',
]

// Weapon (index 8) first, then armor/accessories (0–7)
const DISPLAY_ORDER = [8, 0, 1, 2, 3, 4, 5, 6, 7]

export function extractBuildMeta(
  raw: RawBuild,
  ctx: BuildContext,
  weaponTypeFn: (id: number) => string | null,
  result: BuildResult,
): BuildMeta {
  const wid = raw.equipmentIds[8]
  const wtype = wid != null ? weaponTypeFn(wid) : null
  const className = wtype ? (WEP_TO_CLASS[wtype] ?? 'Build') : 'Build'

  const items = DISPLAY_ORDER.map((slot) => {
    const id = raw.equipmentIds[slot]
    const item = id != null ? ctx.rawItemIndex.resolveId(id) : null
    const isNone = item == null || (item.id as number) >= 10000 // ids 10000–10008 are NONE_RAW_ITEMS (empty slots)
    return {
      slot: SLOT_LABELS[slot]!,
      name: isNone ? '—' : String(item!.displayName),
    }
  })

  return {
    level: raw.level,
    className,
    items,
    dps: result.melee.averageDps,
    ehp: result.defense.ehp.withAgi,
  }
}
