import type { PowderElement } from '~/lib/types/powder'
import { POWDER_NAME_BY_ID } from '~/lib/data/powder-constants'
import { POWDER_ELEMENT_META } from '~/lib/data/powder-elements'

export interface PowderMarket {
  name: string
  tier: number
}

/** Map a build powder id (e.g. the "t6" powder) to its WynnVentory market name + tier. */
export function powderMarket(powderId: number): PowderMarket | null {
  const short = POWDER_NAME_BY_ID.get(powderId) // e.g. "t6"
  if (!short)
    return null
  // Safe cast: POWDER_NAME_BY_ID is built exclusively from SKP_ELEMENTS keys, so
  // short[0] is always a valid PowderElement; the meta null-guard below catches any
  // unexpected value anyway.
  const el = short[0] as PowderElement
  const tier = Number(short.slice(1))
  const meta = POWDER_ELEMENT_META[el]
  if (!meta || !Number.isFinite(tier))
    return null
  return { name: `${meta.name} Powder`, tier }
}
