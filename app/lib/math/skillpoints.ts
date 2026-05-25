/** Convert a skillpoint count to a float percentage. Port of build_utils.js skillPointsToPercentage. */
export function skillPointsToPercentage(skp: number): number {
  if (skp <= 0)
    return 0.0
  if (skp >= 150)
    skp = 150
  const r = 0.9908
  return (r / (1 - r) * (1 - r ** skp)) / 100.0
}

// WYNN2 skillpoint max scaling. Intelligence is cost reduction.
export const SKILLPOINT_FINAL_MULT = [1, 1, 0.5 / skillPointsToPercentage(150), 0.867, 0.951]
export const SKILLPOINT_DAMAGE_MULT = [1, 1, 1, 0.867, 0.951]

/** Levels → available skillpoints. Port of build_utils.js levelToSkillPoints. */
export function levelToSkillPoints(level: number): number {
  if (level < 1)
    return 0
  if (level >= 101)
    return 200
  return (level - 1) * 2
}

/** Levels → base HP. Port of build_utils.js levelToHPBase (clamped to [1,121]). */
export function levelToHPBase(level: number): number {
  const clamped = level < 1 ? 1 : level > 121 ? 121 : level
  return 5 * clamped + 5
}
