/**
 * Pure routing from a search item to the equipment slot(s) it can occupy.
 *
 * Slot order mirrors the builder's EquipmentGrid (and the build codec's
 * equipment array): the 2-col preview reads down the armour column then the
 * accessory column, with the weapon spanning the foot.
 */

/** Equipment slot indices, matching `RawBuild.equipment` ordering. */
export const SLOT = {
  helmet: 0,
  chestplate: 1,
  leggings: 2,
  boots: 3,
  ring1: 4,
  ring2: 5,
  bracelet: 6,
  necklace: 7,
  weapon: 8,
} as const

/** Human labels per slot index, for accessible names and toasts. */
export const SLOT_LABELS = [
  'Helmet',
  'Chestplate',
  'Leggings',
  'Boots',
  'Ring 1',
  'Ring 2',
  'Bracelet',
  'Necklace',
  'Weapon',
] as const

export const EQUIP_SLOT_COUNT = SLOT_LABELS.length

/** The minimum shape of a search item this module needs to route. */
export interface RoutableItem {
  type: 'weapon' | 'armour' | 'accessory'
  subType: string
}

/**
 * The slot(s) an item is eligible for. `ambiguous` is true when the item maps
 * to more than one interchangeable slot (rings), so the caller must let the
 * user pick rather than auto-routing.
 */
export interface SlotMatch {
  slots: number[]
  ambiguous: boolean
}

const ARMOUR_SLOT: Record<string, number> = {
  helmet: SLOT.helmet,
  chestplate: SLOT.chestplate,
  leggings: SLOT.leggings,
  boots: SLOT.boots,
}

const ACCESSORY_SLOT: Record<string, number> = {
  bracelet: SLOT.bracelet,
  necklace: SLOT.necklace,
}

/**
 * Resolve which equipment slot(s) a search item can be equipped into.
 * Returns an empty match for items that aren't build equipment (the caller
 * should then withhold the equip affordance entirely).
 */
export function slotsForItem(item: RoutableItem): SlotMatch {
  if (item.type === 'weapon')
    return { slots: [SLOT.weapon], ambiguous: false }

  const sub = item.subType?.toLowerCase()

  if (item.type === 'armour') {
    const slot = ARMOUR_SLOT[sub]
    return slot === undefined ? { slots: [], ambiguous: false } : { slots: [slot], ambiguous: false }
  }

  if (item.type === 'accessory') {
    if (sub === 'ring')
      return { slots: [SLOT.ring1, SLOT.ring2], ambiguous: true }
    const slot = ACCESSORY_SLOT[sub]
    return slot === undefined ? { slots: [], ambiguous: false } : { slots: [slot], ambiguous: false }
  }

  return { slots: [], ambiguous: false }
}

/** Whether an item can be equipped into the build at all. */
export function isEquippable(item: RoutableItem): boolean {
  return slotsForItem(item).slots.length > 0
}
