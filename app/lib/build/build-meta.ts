import type { RawBuild } from '../codec/build-codec'
import type { BuildContext, BuildResult } from './compute-build'
import { slotItemId } from '../codec/build-codec'
import { WEP_TO_CLASS } from '../codec/wep-to-class'
import { POWDER_NAME_BY_ID } from '../data/powder-constants'
import { itemIconUrl } from '../items/icon'

export interface BuildMeta {
  level: number
  className: string
  items: Array<{ slot: string, name: string, tier?: string | null, icon?: string | null, powders?: string }>
  dps: number
  ehp: number
}

/** Equipment slot index → index in raw.powders array (matches POWDERABLE in equipment-codec). */
const POWDER_INDEX = new Map([[0, 0], [1, 1], [2, 2], [3, 3], [8, 4]])

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
  const weaponSlot = raw.equipment[8]
  const wid = slotItemId(weaponSlot)
  const wtype = wid != null ? weaponTypeFn(wid) : null
  const className = wtype ? (WEP_TO_CLASS[wtype] ?? 'Build') : 'Build'

  const items = DISPLAY_ORDER.map((slot) => {
    const slotEntry = raw.equipment[slot]
    const isCrafted = slotEntry?.kind === 'crafted'
    const id = slotItemId(slotEntry)
    const item = id != null ? ctx.rawItemIndex.resolveId(id) : null
    const isNone = !isCrafted && (item == null || (item.id as number) >= 10000) // ids 10000–10008 are NONE_RAW_ITEMS (empty slots)

    const powderIdx = POWDER_INDEX.get(slot)
    const powderIds = powderIdx !== undefined ? (raw.powders[powderIdx] ?? []) : []
    const powders = powderIds.map(pid => POWDER_NAME_BY_ID.get(pid) ?? '').join('') || undefined

    return {
      slot: SLOT_LABELS[slot]!,
      name: isCrafted ? 'Crafted' : (isNone ? '—' : String(item!.displayName)),
      tier: isCrafted ? 'Crafted' : (isNone ? null : String(item!.tier ?? 'Normal')),
      icon: !isCrafted && !isNone ? itemIconUrl(item) : null,
      powders,
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
