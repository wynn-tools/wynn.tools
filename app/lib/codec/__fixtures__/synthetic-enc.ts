import type { EncodingConstants } from '../encoding-constants'

/**
 * Synthetic encoding constants for round-trip unit tests. Values are plausible
 * but arbitrary — they only need to be internally consistent (encode and decode
 * read the same object). 5 powder elements, 7 tiers.
 */
export const SYNTHETIC_ENC: EncodingConstants = {
  // equipment
  EQUIPMENT_NUM: 9,
  ITEM_ID_BITLEN: 13,
  EQUIPMENT_KIND: { BITLEN: 2, NORMAL: 0, CRAFTED: 1, CUSTOM: 2 },
  EQUIPMENT_POWDERS_FLAG: { BITLEN: 1, NO_POWDERS: 0, HAS_POWDERS: 1 },
  // powders
  POWDER_ELEMENTS_COUNT: 5,
  POWDER_TIERS: 7,
  POWDER_ID_BITLEN: 6,
  POWDER_WRAPPER_BITLEN: 3,
  POWDER_REPEAT_OP: { BITLEN: 1, REPEAT: 1, NO_REPEAT: 0 },
  POWDER_REPEAT_TIER_OP: { BITLEN: 1, REPEAT_TIER: 1, CHANGE_POWDER: 0 },
  POWDER_CHANGE_OP: { BITLEN: 1, NEW_POWDER: 0, NEW_ITEM: 1 },
  // skillpoints
  SP_FLAG: { BITLEN: 1, AUTOMATIC: 0, ASSIGNED: 1 },
  SP_ELEMENT_FLAG: { BITLEN: 1, ELEMENT_UNASSIGNED: 0, ELEMENT_ASSIGNED: 1 },
  SP_TYPES: 5,
  MAX_SP_BITLEN: 10,
  // level
  LEVEL_FLAG: { BITLEN: 1, MAX: 1, OTHER: 0 },
  LEVEL_BITLEN: 8,
  MAX_LEVEL: 106,
  // tomes
  TOMES_FLAG: { BITLEN: 1, NO_TOMES: 0, HAS_TOMES: 1 },
  TOME_SLOT_FLAG: { BITLEN: 1, UNUSED: 0, USED: 1 },
  TOME_NUM: 7,
  TOME_ID_BITLEN: 8,
  // aspects
  ASPECTS_FLAG: { BITLEN: 1, NO_ASPECTS: 0, HAS_ASPECTS: 1 },
  ASPECT_SLOT_FLAG: { BITLEN: 1, UNUSED: 0, USED: 1 },
  NUM_ASPECTS: 5,
  ASPECT_ID_BITLEN: 9,
  ASPECT_TIER_BITLEN: 3,
}
