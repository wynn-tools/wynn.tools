/**
 * Item resolution layer.
 *
 * Turns a RawBuild's item IDs into hppeng-style expanded statMaps with powders applied
 * and NONE synthesis for empty slots.
 *
 * Ports: load_item.js clean_item, build_utils.js item_fields/str_item_fields/none_items_info,
 *        powders.js applyArmorPowders.
 */

import type { RawBuild } from '../codec/build-codec'
import type { EquipmentSlot } from '../codec/equipment-codec'
import type { CraftContext, CraftedItem } from '../crafter/types'
import type { ExpandedItem } from '../math/expand-item'
import { computeCraft } from '../crafter/compute-craft'
import { POWDER_TIERS, SKP_ELEMENTS } from '../data/powder-constants'
import { expandItem } from '../math/expand-item'
import { POWDER_ARMOR_HEALTH, POWDER_STATS } from '../math/powder-stats'
import { applyWeaponPowders } from '../math/weapon-damage'

// ---------------------------------------------------------------------------
// Field lists — ported verbatim from build_utils.js item_fields / str_item_fields
// ---------------------------------------------------------------------------

/**
 * All known item fields. Port of build_utils.js `item_fields` array (verbatim).
 */
// prettier-ignore
export const ITEM_FIELDS: readonly string[] = [
  'name',
  'displayName',
  'lore',
  'color',
  'tier',
  'set',
  'slots',
  'type',
  'material',
  'drop',
  'quest',
  'restrict',
  'nDam',
  'fDam',
  'wDam',
  'aDam',
  'tDam',
  'eDam',
  'atkSpd',
  'hp',
  'fDef',
  'wDef',
  'aDef',
  'tDef',
  'eDef',
  'lvl',
  'classReq',
  'strReq',
  'dexReq',
  'intReq',
  'defReq',
  'agiReq',
  'hprPct',
  'mr',
  'sdPct',
  'mdPct',
  'ls',
  'ms',
  'xpb',
  'lb',
  'ref',
  'str',
  'dex',
  'int',
  'agi',
  'def',
  'thorns',
  'expd',
  'spd',
  'atkTier',
  'poison',
  'hpBonus',
  'spRegen',
  'eSteal',
  'hprRaw',
  'sdRaw',
  'mdRaw',
  'fDamPct',
  'wDamPct',
  'aDamPct',
  'tDamPct',
  'eDamPct',
  'fDefPct',
  'wDefPct',
  'aDefPct',
  'tDefPct',
  'eDefPct',
  'fixID',
  'category',
  'spPct1',
  'spRaw1',
  'spPct2',
  'spRaw2',
  'spPct3',
  'spRaw3',
  'spPct4',
  'spRaw4',
  'rSdRaw',
  'sprint',
  'sprintReg',
  'jh',
  'lq',
  'gXp',
  'gSpd',
  'id',
  'majorIds',
  'damMobs',
  'defMobs',
  // wynn2 damages
  'eMdPct',
  'eMdRaw',
  'eSdPct',
  'eSdRaw',
  'eDamRaw',
  'eDamAddMin',
  'eDamAddMax',
  'tMdPct',
  'tMdRaw',
  'tSdPct',
  'tSdRaw',
  'tDamRaw',
  'tDamAddMin',
  'tDamAddMax',
  'wMdPct',
  'wMdRaw',
  'wSdPct',
  'wSdRaw',
  'wDamRaw',
  'wDamAddMin',
  'wDamAddMax',
  'fMdPct',
  'fMdRaw',
  'fSdPct',
  'fSdRaw',
  'fDamRaw',
  'fDamAddMin',
  'fDamAddMax',
  'aMdPct',
  'aMdRaw',
  'aSdPct',
  'aSdRaw',
  'aDamRaw',
  'aDamAddMin',
  'aDamAddMax',
  'nMdPct',
  'nMdRaw',
  'nSdPct',
  'nSdRaw',
  'nDamPct',
  'nDamRaw',
  'nDamAddMin',
  'nDamAddMax',
  'damPct',
  'damRaw',
  'damAddMin',
  'damAddMax',
  'rMdPct',
  'rMdRaw',
  'rSdPct',
  'rDamPct',
  'rDamRaw',
  'rDamAddMin',
  'rDamAddMax',
  'critDamPct',
  'spPct1Final',
  'spPct2Final',
  'spPct3Final',
  'spPct4Final',
  'healPct',
  'kb',
  'weakenEnemy',
  'slowEnemy',
  'rDefPct',
  'maxMana',
  'mainAttackRange',
]

/**
 * String-valued item fields. Port of build_utils.js `str_item_fields` array.
 *
 * NOTE on JS quirk: the original source code does `key in str_item_fields` where
 * `str_item_fields` is a JS Array. In JS, `key in array` checks *index membership*
 * (i.e. "is key a valid numeric index or named property?"), NOT value membership —
 * so the original check is effectively always false for string field names (since
 * no string like "name" is a valid array index). This appears to be a latent bug in
 * hppeng: clean_item would always default string fields to `0` rather than `""`.
 *
 * However, items already have these string fields set from the raw JSON, so the
 * default only applies to *missing* fields. In practice the damage strings
 * (`nDam`, `eDam`, etc.) and `atkSpd` ARE missing on armor items and need correct
 * defaults. We port the *intent* here (string fields → `""`) using a Set for
 * value-based membership, which is the correct semantic.
 */
// prettier-ignore
const STR_ITEM_FIELDS_SET: ReadonlySet<string> = new Set([
  'name',
  'displayName',
  'lore',
  'color',
  'tier',
  'set',
  'type',
  'material',
  'drop',
  'quest',
  'restrict',
  'category',
  'atkSpd',
])

// ---------------------------------------------------------------------------
// Cleaned raw item type
// ---------------------------------------------------------------------------

export interface CleanedRawItem extends Record<string, unknown> {
  id: number
  name: string
  displayName: string
  category: string
  type: string
  skillpoints: [number, number, number, number, number]
  reqs: [number, number, number, number, number]
  has_negstat: boolean
  majorIds: unknown[]
  fixID?: boolean
  remapID?: number
  slots: number
  nDam: string
  eDam: string
  tDam: string
  wDam: string
  fDam: string
  aDam: string
}

// ---------------------------------------------------------------------------
// cleanRawItem — port of load_item.js clean_item
// ---------------------------------------------------------------------------

/**
 * Clean a raw item record (port of load_item.js `clean_item`).
 *
 * Returns a cleaned copy; never mutates the input.
 * For items with `remapID`, returns a shallow copy without any cleaning
 * (they are redirects and are never used directly as items).
 */
export function cleanRawItem(raw: Record<string, unknown>): CleanedRawItem {
  const item = { ...raw } as CleanedRawItem

  if (item.remapID !== undefined) {
    // Redirect item — not a real item, return as-is
    return item
  }

  if (item.displayName === undefined) {
    item.displayName = item.name as string
  }

  // Build skillpoints = [str, dex, int, def, agi]
  const sp: [number, number, number, number, number] = [
    (item.str as number) ?? 0,
    (item.dex as number) ?? 0,
    (item.int as number) ?? 0,
    (item.def as number) ?? 0,
    (item.agi as number) ?? 0,
  ]
  // Build reqs = [strReq, dexReq, intReq, defReq, agiReq]
  const reqs: [number, number, number, number, number] = [
    (item.strReq as number) ?? 0,
    (item.dexReq as number) ?? 0,
    (item.intReq as number) ?? 0,
    (item.defReq as number) ?? 0,
    (item.agiReq as number) ?? 0,
  ]

  let has_negstat = false
  for (let i = 0; i < 5; i++) {
    reqs[i] ??= 0
    sp[i] ??= 0
    if ((sp[i] as number) < 0)
      has_negstat = true
  }

  item.skillpoints = sp
  item.reqs = reqs
  item.has_negstat = has_negstat

  // Default all item_fields
  for (const key of ITEM_FIELDS) {
    if ((item as Record<string, unknown>)[key] === undefined) {
      if (key === 'majorIds') {
        ;(item as Record<string, unknown>)[key] = []
      }
      else if (STR_ITEM_FIELDS_SET.has(key)) {
        ;(item as Record<string, unknown>)[key] = ''
      }
      else {
        ;(item as Record<string, unknown>)[key] = 0
      }
    }
  }

  return item
}

// ---------------------------------------------------------------------------
// NONE_RAW_ITEMS — port of load_item.js none_items_info
// ---------------------------------------------------------------------------

/** Slot descriptors, index 0..8. Port of load_item.js `none_items_info`. */
const NONE_ITEMS_INFO: Array<[string, string, string]> = [
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

/**
 * Synthesized NONE items for empty equipment slots.
 * 9 entries in slot order: helmet, chestplate, leggings, boots, ring1, ring2, bracelet, necklace, weapon.
 * ids 10000..10008, fixID: true, all damage strings '0-0', zero stats.
 */
export const NONE_RAW_ITEMS: CleanedRawItem[] = NONE_ITEMS_INFO.map(([category, type, name], i) => {
  const item: Record<string, unknown> = {
    slots: 0,
    category,
    type,
    name,
    displayName: name,
    set: null,
    quest: null,
    skillpoints: [0, 0, 0, 0, 0] as [number, number, number, number, number],
    has_negstat: false,
    reqs: [0, 0, 0, 0, 0] as [number, number, number, number, number],
    fixID: true,
    tier: 'Normal',
    id: 10000 + i,
    nDam: '0-0',
    eDam: '0-0',
    tDam: '0-0',
    wDam: '0-0',
    fDam: '0-0',
    aDam: '0-0',
  }
  // Apply clean_item defaults for missing fields (reuse cleanRawItem logic)
  return cleanRawItem(item as Record<string, unknown>) as CleanedRawItem
})

// ---------------------------------------------------------------------------
// buildRawItemIndex
// ---------------------------------------------------------------------------

export interface RawItemIndex {
  /** All cleaned items by numeric id (redirects stored separately). */
  byId: Map<number, CleanedRawItem>
  /**
   * Resolve an id to a cleaned item, following remapID redirects (cycle-guarded).
   * Returns null if the id is unknown or a redirect cycle is detected.
   */
  resolveId: (id: number | null) => CleanedRawItem | null
}

/**
 * Build a lookup index from an array of raw item records.
 * - Non-remap items are cleaned and indexed by id.
 * - remapID entries are stored as redirects.
 * - NONE items (ids 10000..10008) are pre-populated.
 */
export function buildRawItemIndex(rawItems: Record<string, unknown>[]): RawItemIndex {
  const byId = new Map<number, CleanedRawItem>()
  const redirectMap = new Map<number, number>()

  // Pre-populate NONE items
  for (const noneItem of NONE_RAW_ITEMS) {
    byId.set(noneItem.id, noneItem)
  }

  for (const raw of rawItems) {
    const id = raw.id as number
    if (raw.remapID !== undefined) {
      redirectMap.set(id, raw.remapID as number)
    }
    else {
      byId.set(id, cleanRawItem(raw))
    }
  }

  function resolveId(id: number | null): CleanedRawItem | null {
    if (id === null)
      return null
    const visited = new Set<number>()
    let current = id
    while (true) {
      if (visited.has(current))
        return null // cycle detected
      visited.add(current)
      const remap = redirectMap.get(current)
      if (remap !== undefined) {
        current = remap
        continue
      }
      return byId.get(current) ?? null
    }
  }

  return { byId, resolveId }
}

// ---------------------------------------------------------------------------
// buildRawTomeIndex
// ---------------------------------------------------------------------------

export interface RawTomeIndex {
  byId: Map<number, CleanedRawItem>
  resolveId: (id: number) => CleanedRawItem | null
}

export function buildRawTomeIndex(rawTomes: Record<string, unknown>[]): RawTomeIndex {
  const byId = new Map<number, CleanedRawItem>()
  const redirects = new Map<number, number>()
  for (const raw of rawTomes) {
    if (raw.remapID !== undefined && raw.id !== undefined) {
      redirects.set(raw.id as number, raw.remapID as number)
      continue
    }
    const t = cleanRawItem(raw)
    byId.set(t.id, t)
  }
  function resolveId(id: number): CleanedRawItem | null {
    let cur = id
    const seen = new Set<number>()
    while (redirects.has(cur)) {
      if (seen.has(cur))
        return null
      seen.add(cur)
      cur = redirects.get(cur)!
    }
    return byId.get(cur) ?? null
  }
  return { byId, resolveId }
}

// ---------------------------------------------------------------------------
// resolveTomes
// ---------------------------------------------------------------------------

/**
 * Resolve a build's tome IDs into expanded statMaps.
 *
 * - For each non-null tomeIds[i]: expandItem(tomeIndex.resolveId(id)) — skip nulls and unresolved.
 * - guildTome = expanded tome at index 6 (if non-null and resolvable),
 *   else an expanded zero tome (so it contributes zero skillpoints/reqs).
 */
export function resolveTomes(
  tomeIds: Array<number | null>,
  tomeIndex: RawTomeIndex,
): { tomes: ExpandedItem[], guildTome: ExpandedItem } {
  const tomes: ExpandedItem[] = []

  for (let i = 0; i < tomeIds.length; i++) {
    const id = tomeIds[i]
    if (id === null || id === undefined)
      continue
    const cleaned = tomeIndex.resolveId(id)
    if (cleaned === null)
      continue
    tomes.push(expandItem(cleaned as Record<string, unknown>))
  }

  // Guild tome is index 6
  const guildTomeId = tomeIds[6] ?? null
  let guildTome: ExpandedItem
  if (guildTomeId !== null && guildTomeId !== undefined) {
    const cleaned = tomeIndex.resolveId(guildTomeId)
    if (cleaned !== null) {
      guildTome = expandItem(cleaned as Record<string, unknown>)
    }
    else {
      guildTome = expandItem(
        cleanRawItem({ id: -1, name: 'NoGuildTome', type: 'guildTome', category: 'tome' }) as Record<string, unknown>,
      )
    }
  }
  else {
    guildTome = expandItem(
      cleanRawItem({ id: -1, name: 'NoGuildTome', type: 'guildTome', category: 'tome' }) as Record<string, unknown>,
    )
  }

  return { tomes, guildTome }
}

// ---------------------------------------------------------------------------
// applyArmorPowders — port of powders.js applyArmorPowders (L81-90)
// ---------------------------------------------------------------------------

/**
 * Apply armor powders to an expanded armor statMap. Mutates the map.
 *
 * Port of powders.js `applyArmorPowders` (L81-90):
 *   for each powder id:
 *     name = element char (SKP_ELEMENTS[floor(id / POWDER_TIERS)])
 *     prevName = SKP_ELEMENTS[(elementIndex + 4) % 5]
 *     item[name+'Def'] += powder.defPlus
 *     item[prevName+'Def'] -= powder.defMinus
 *     item.hp += POWDER_ARMOR_HEALTH[id % POWDER_TIERS]
 *
 * In the original JS, `powderNames.get(id).charAt(0)` is used to get the
 * element char — equivalent to `SKP_ELEMENTS[Math.floor(id / POWDER_TIERS)]`
 * given how powder IDs are constructed (element-major × POWDER_TIERS).
 */
export function applyArmorPowders(item: ExpandedItem): void {
  const powders = (item.get('powders') as number[] | undefined) ?? []
  for (const id of powders) {
    const powder = POWDER_STATS[id]!
    const elementIdx = Math.floor(id / POWDER_TIERS)
    const name = SKP_ELEMENTS[elementIdx]!
    const prevName = SKP_ELEMENTS[(elementIdx + 4) % 5]!
    item.set(`${name}Def`, ((item.get(`${name}Def`) as number) || 0) + powder.defPlus)
    item.set(`${prevName}Def`, ((item.get(`${prevName}Def`) as number) || 0) - powder.defMinus)
    item.set('hp', ((item.get('hp') as number) || 0) + POWDER_ARMOR_HEALTH[id % POWDER_TIERS]!)
  }
}

// ---------------------------------------------------------------------------
// resolveBuildItems
// ---------------------------------------------------------------------------

export interface ResolvedBuildItems {
  /** 8 expanded statMaps: [helmet, chestplate, leggings, boots, ring1, ring2, bracelet, necklace]. */
  equipment: ExpandedItem[]
  /** Expanded weapon statMap with powders and applyWeaponPowders applied. */
  weapon: ExpandedItem
  /** All 9 items: [...equipment, weapon]. */
  allItems: ExpandedItem[]
  /**
   * Items in Wynn skillpoint order:
   * [boots(3), leggings(2), chestplate(1), helmet(0), ring1(4), ring2(5), bracelet(6), necklace(7)].
   * Port of builder_graph.js:466-476 skp order.
   */
  wynnOrder: ExpandedItem[]
}

/** Wynn skillpoint order indices into equipment[]. Port of builder_graph.js:466-476. */
const WYNN_ORDER_INDICES = [3, 2, 1, 0, 4, 5, 6, 7] as const

/**
 * Equipment slot index → index into the decoded `powders` array.
 * The codec only encodes powders for powderable slots, so `powders` is dense in
 * POWDERABLE order: [helmet, chest, legs, boots, weapon]. The weapon (slot 8) is at
 * powders[4], NOT powders[8]. Accessories (slots 4-7) are never powderable.
 * Must match equipment-codec.ts POWDERABLE = [0, 1, 2, 3, 8].
 */
export const POWDER_INDEX_BY_SLOT = new Map<number, number>([[0, 0], [1, 1], [2, 2], [3, 3], [8, 4]])

function powdersForSlot(powders: number[][], slot: number): number[] {
  const idx = POWDER_INDEX_BY_SLOT.get(slot)
  return idx === undefined ? [] : (powders[idx] ?? [])
}

// ---------------------------------------------------------------------------
// craftedToExpandedItem — adapt a CraftedItem into the ExpandedItem shape
// ---------------------------------------------------------------------------

/**
 * Map a CraftedItem (output of crafter/compute-craft) into the legacy
 * ExpandedItem (Map) shape consumed by the rest of the math pipeline.
 *
 * Reference: WB `craft.js`. Crafted identifications are ranges → both
 * `minRolls` and `maxRolls` are populated from `{min,max}` directly (so the
 * roll layer never re-rolls). The raw legacy field (e.g. `sdPct`) is set to
 * the maximum value, matching `expandItem`'s convention for non-rolled items
 * with a present "raw" magnitude.
 *
 * Stat-fields that are absent on this craft default to 0 (number) or '' /
 * '0-0' (string) so downstream math doesn't need to special-case "crafted".
 */
export function craftedToExpandedItem(crafted: CraftedItem): ExpandedItem {
  const raw: Record<string, unknown> = {
    // Identity
    name: crafted.hash,
    displayName: crafted.hash,
    tier: 'Crafted',
    category: crafted.category,
    type: crafted.type,
    slots: crafted.slots,
    // Use upper bound for `lvl`; reqs.level holds the same value.
    lvl: crafted.lvl,
    // Powders pass through; applyArmorPowders / applyWeaponPowders below will
    // operate on these.
    powders: crafted.powders.slice(),
    // Mark as fixID so expandItem doesn't attempt to roll *anything*. We then
    // explicitly populate minRolls/maxRolls from the craft's id ranges below
    // (overwriting the all-zero maps that expandItem produced for fixID).
    fixID: true,
  }

  // ---- Skillpoint requirements -------------------------------------------
  for (const skp of ['strReq', 'dexReq', 'intReq', 'defReq', 'agiReq'] as const) {
    raw[skp] = crafted.reqs[skp] ?? 0
  }

  // ---- HP / damage / defenses --------------------------------------------
  if (crafted.category === 'armor') {
    const hp = crafted.hp ?? [0, 0]
    // Crafted armor stores a [low, high] range; resolve.ts uses the upper
    // bound as the canonical "hp" (mirrors WB which displays the max roll).
    raw.hp = hp[1]
    if (crafted.defenses) {
      for (const [k, v] of Object.entries(crafted.defenses))
        raw[k] = v
    }
  }

  if (crafted.category === 'weapon') {
    // damage map keys are 'nDam', 'eDam', etc. (per crafter/types). Convert
    // each [min,max] tuple to the "min-max" string the math expects.
    const dmg = crafted.damage ?? {}
    for (const elem of ['nDam', 'eDam', 'tDam', 'wDam', 'fDam', 'aDam']) {
      const tuple = dmg[elem]
      raw[elem] = tuple ? `${tuple[0]}-${tuple[1]}` : '0-0'
    }
    if (crafted.atkSpd)
      raw.atkSpd = crafted.atkSpd
  }

  // cleanRawItem fills the rest of the default fields (numeric → 0, string
  // → '') so the ExpandedItem looks structurally identical to a normal item.
  const cleaned = cleanRawItem(raw)
  const expanded = expandItem(cleaned as Record<string, unknown>)

  // Overwrite minRolls/maxRolls with the craft's id ranges. expandItem with
  // fixID gave us all-zero maps; we replace entries that the craft actually
  // produced. Non-rolled identifications stay at 0, matching the "no roll"
  // convention.
  const minRolls = expanded.get('minRolls') as Map<string, number>
  const maxRolls = expanded.get('maxRolls') as Map<string, number>
  for (const [key, range] of Object.entries(crafted.identifications)) {
    minRolls.set(key, range.min)
    maxRolls.set(key, range.max)
    // Also surface the upper-bound on the flat field so any code path that
    // reads `item.get('sdPct')` (non-rolled accessor) sees something sane.
    expanded.set(key, range.max)
  }

  return expanded
}

/**
 * Resolve a RawBuild's equipment slots to expanded statMaps with powders applied.
 *
 * - equipment[0..7] = helmet..necklace; NORMAL slot with null id → NONE_RAW_ITEM.
 * - equipment[8] = weapon; NORMAL slot with null id → NONE_RAW_ITEMS[8].
 * - CRAFTED slots resolve via `computeCraft(slot.raw, craftContext)` and are
 *   adapted into the ExpandedItem shape by `craftedToExpandedItem`.
 * - Powders are read via POWDER_INDEX_BY_SLOT (the decoded `powders` array is in
 *   POWDERABLE order [helmet, chest, legs, boots, weapon], not equipment-slot order).
 * - Armor items (category === 'armor'): applyArmorPowders after setting powders.
 * - Accessories: not powderable (powdersForSlot returns []).
 * - Weapon: powders from powders[4]; applyWeaponPowders called after setting them.
 *
 * If a slot is crafted and `craftContext` is undefined, throws — callers must
 * pass the context resolved from the CDN at build-data load time (Task 11).
 */
export function resolveBuildItems(
  rawBuild: RawBuild,
  index: RawItemIndex,
  craftContext?: CraftContext,
): ResolvedBuildItems {
  const { equipment: slots, powders } = rawBuild

  function resolveSlot(slot: EquipmentSlot | undefined, slotIdx: number): ExpandedItem {
    if (slot?.kind === 'crafted') {
      if (!craftContext) {
        throw new Error(
          `resolveBuildItems: slot ${slotIdx} is crafted but no craftContext was provided`,
        )
      }
      const crafted = computeCraft(slot.raw, craftContext)
      return craftedToExpandedItem(crafted)
    }
    // NORMAL slot or undefined (defensive fallback).
    const id = slot?.kind === 'normal' ? slot.id : null
    const raw = index.resolveId(id) ?? NONE_RAW_ITEMS[slotIdx]!
    return expandItem(raw as Record<string, unknown>)
  }

  const equipment: ExpandedItem[] = []
  for (let i = 0; i < 8; i++) {
    const m = resolveSlot(slots[i], i)
    const slotCount = Number(m.get('slots')) || 0
    const itemPowders = powdersForSlot(powders, i).slice(0, slotCount)
    m.set('powders', itemPowders)
    if (m.get('category') === 'armor') {
      applyArmorPowders(m)
    }
    equipment.push(m)
  }

  // Weapon (slot index 8)
  const weapon = resolveSlot(slots[8], 8)
  const weaponSlots = Number(weapon.get('slots')) || 0
  const weaponPowders = powdersForSlot(powders, 8).slice(0, weaponSlots)
  weapon.set('powders', weaponPowders)
  applyWeaponPowders(weapon)

  const allItems: ExpandedItem[] = [...equipment, weapon]
  const wynnOrder: ExpandedItem[] = WYNN_ORDER_INDICES.map(idx => equipment[idx]!)

  return { equipment, weapon, allItems, wynnOrder }
}
