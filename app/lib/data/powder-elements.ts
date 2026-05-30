import type { PowderElement } from '../types/powder'

/**
 * Per-element display metadata for powders, shared across the equipment chips,
 * the powder editor, and anywhere else a powder element is rendered.
 *
 * `letter` is the colorblind-safe identifier: a single uppercase initial whose
 * shape distinguishes the element without relying on hue or on the decorative
 * `glyph` (which renders as a generic asterisk when the font lacks it).
 */
export interface PowderElementMeta {
  name: string
  letter: string
  glyph: string
  color: string
}

export const POWDER_ELEMENT_META: Record<PowderElement, PowderElementMeta> = {
  e: { name: 'Earth', letter: 'E', glyph: '✤', color: 'oklch(72% 0.18 145)' },
  t: { name: 'Thunder', letter: 'T', glyph: '✦', color: 'oklch(82% 0.15 95)' },
  w: { name: 'Water', letter: 'W', glyph: '❉', color: 'oklch(75% 0.13 215)' },
  f: { name: 'Fire', letter: 'F', glyph: '✹', color: 'oklch(68% 0.18 35)' },
  a: { name: 'Air', letter: 'A', glyph: '❋', color: 'oklch(85% 0.04 250)' },
}

/** Look up element meta from a powder shorthand name like "t6" → Thunder. */
export function powderElementMeta(name: string | undefined): PowderElementMeta | null {
  const el = name?.[0] as PowderElement | undefined
  return el ? POWDER_ELEMENT_META[el] ?? null : null
}
