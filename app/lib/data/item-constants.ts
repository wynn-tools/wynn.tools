import type { Item, ItemCategory, ItemType } from '../types/item'

/** Equip slot types in hppeng order (helmet→weapons). */
export const ITEM_TYPES: ItemType[] = [
  'helmet',
  'chestplate',
  'leggings',
  'boots',
  'ring',
  'bracelet',
  'necklace',
  'dagger',
  'wand',
  'bow',
  'spear',
  'relik',
]

const NONE_ITEM_DEFS: Array<[ItemCategory, ItemType, string]> = [
  ['armor', 'helmet', 'No Helmet'],
  ['armor', 'chestplate', 'No Chestplate'],
  ['armor', 'leggings', 'No Leggings'],
  ['armor', 'boots', 'No Boots'],
  ['accessory', 'ring', 'No Ring 1'],
  ['accessory', 'ring', 'No Ring 2'],
  ['accessory', 'bracelet', 'No Bracelet'],
  ['accessory', 'necklace', 'No Necklace'],
  ['weapon', 'dagger', 'No Weapon'],
]

function emptyRequirements() {
  return {
    level: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    defence: 0,
    agility: 0,
    class: null,
    quest: null,
  }
}

/** Placeholder items for empty slots; ids match hppeng load_item.js (10000 + i). */
export const NONE_ITEMS: Item[] = NONE_ITEM_DEFS.map(([category, type, name], i) => ({
  name,
  displayName: name,
  id: 10000 + i,
  category,
  type,
  tier: 'Normal',
  level: 0,
  slots: 0,
  requirements: emptyRequirements(),
  armourMaterial: null,
  drop: 'never',
  lore: '',
  set: null,
  stats: {},
}))

const NONE_ITEM_NAMES = new Set(NONE_ITEMS.map(i => i.name))

export function isNoneItem(name: string): boolean {
  return NONE_ITEM_NAMES.has(name)
}
