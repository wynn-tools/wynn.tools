import type { EncodingConstants } from './encoding-constants'

/** Always-nonnegative modulo. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** Read a top-level numeric constant (e.g. ITEM_ID_BITLEN). */
export function num(enc: EncodingConstants, field: string): number {
  return enc[field] as number
}

/** Read a nested flag map (e.g. POWDER_REPEAT_OP -> { BITLEN, NO_REPEAT, REPEAT, ... }). */
export function flags(enc: EncodingConstants, field: string): Record<string, number> {
  return enc[field] as Record<string, number>
}

/** Read the BITLEN of a nested flag field. */
export function bitlen(enc: EncodingConstants, field: string): number {
  return (enc[field] as Record<string, number>).BITLEN!
}
