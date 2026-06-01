export interface ResolvedImport {
  /** wynn.tools build slot index: 0..3 armour, 4|5 ring, 6 bracelet, 7 necklace, 8 weapon. */
  slot: number
  /** wynn.tools item DB id. */
  itemId: number
  /** Shorthand id → raw applied value, ready for the slot's override map. */
  overrides: Map<string, number>
  /** Powder ids in encoded order, format = elementIdx * 6 + (tier - 1). */
  powders: number[]
  /** Non-fatal per-row notes (unknown stat, dropped powder, ring-slot fallback, ignored shiny/reroll). */
  warnings: string[]
  /** Decoded item name from the string (useful for the preview UI). */
  decodedName: string
}

export interface ImportError {
  /** Original line text (trimmed). */
  source: string
  /** User-facing message. */
  message: string
}

export type ImportRow
  = | { ok: true, row: ResolvedImport }
    | { ok: false, error: ImportError }
