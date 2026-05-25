/** Powder element prefixes in encoding order (earth, thunder, water, fire, air). */
export type PowderElement = 'e' | 't' | 'w' | 'f' | 'a'

/** A powder is identified by `${element}${tier}`, e.g. `'e1'`..`'a7'`. */
export type PowderName = string
