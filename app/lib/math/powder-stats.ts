export interface PowderStat {
  min: number
  max: number
  convert: number
  defPlus: number
  defMinus: number
}

function p(min: number, max: number, convert: number, defPlus: number, defMinus: number): PowderStat {
  return { min, max, convert, defPlus, defMinus }
}

/** Per-powder stats, element-major (earth, thunder, water, fire, air) × tiers 1..7. Port of powders.js powderStats. */
export const POWDER_STATS: PowderStat[] = [
  p(4, 5, 17, 2, 1),
  p(6, 7, 21, 5, 2),
  p(7, 9, 25, 9, 3),
  p(8, 9, 31, 14, 4),
  p(9, 11, 38, 22, 7),
  p(11, 12, 46, 29, 7),
  p(12, 14, 52, 37, 12),
  p(1, 8, 9, 2, 1),
  p(1, 12, 11, 4, 1),
  p(2, 14, 13, 8, 2),
  p(2, 15, 17, 13, 3),
  p(3, 17, 22, 20, 5),
  p(4, 19, 28, 28, 6),
  p(5, 21, 32, 36, 11),
  p(3, 4, 13, 3, 1),
  p(5, 6, 15, 6, 1),
  p(6, 8, 17, 11, 3),
  p(7, 8, 21, 16, 4),
  p(8, 10, 26, 23, 6),
  p(10, 13, 32, 32, 10),
  p(11, 15, 38, 40, 15),
  p(2, 5, 14, 3, 1),
  p(4, 7, 16, 6, 1),
  p(5, 9, 19, 10, 2),
  p(6, 9, 24, 15, 3),
  p(7, 11, 30, 22, 5),
  p(9, 14, 37, 31, 9),
  p(10, 16, 44, 39, 14),
  p(2, 6, 11, 3, 1),
  p(3, 9, 14, 6, 2),
  p(4, 11, 17, 10, 3),
  p(5, 11, 22, 16, 5),
  p(7, 12, 28, 23, 7),
  p(8, 15, 35, 30, 8),
  p(9, 17, 42, 38, 13),
]

export const POWDER_ARMOR_HEALTH = [5, 10, 20, 30, 45, 60, 75]
