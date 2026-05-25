import { describe, expect, it } from 'vitest'
import {
  levelToHPBase,
  levelToSkillPoints,
  SKILLPOINT_DAMAGE_MULT,
  SKILLPOINT_FINAL_MULT,
  skillPointsToPercentage,
} from './skillpoints'

describe('skillpoint/level helpers', () => {
  it('skillPointsToPercentage: 0 at/below 0, caps at 150, in [0,1), increasing', () => {
    expect(skillPointsToPercentage(0)).toBe(0)
    expect(skillPointsToPercentage(-5)).toBe(0)
    expect(skillPointsToPercentage(200)).toBe(skillPointsToPercentage(150))
    const a = skillPointsToPercentage(10)
    const b = skillPointsToPercentage(50)
    expect(a).toBeGreaterThan(0)
    expect(b).toBeGreaterThan(a)
    expect(skillPointsToPercentage(150)).toBeLessThan(1)
  })

  it('skillpoint mult tables', () => {
    expect(SKILLPOINT_DAMAGE_MULT).toEqual([1, 1, 1, 0.867, 0.951])
    expect(SKILLPOINT_FINAL_MULT[0]).toBe(1)
    expect(SKILLPOINT_FINAL_MULT[2]).toBeCloseTo(0.5 / skillPointsToPercentage(150), 10)
  })

  it('levelToSkillPoints', () => {
    expect(levelToSkillPoints(0)).toBe(0)
    expect(levelToSkillPoints(1)).toBe(0)
    expect(levelToSkillPoints(51)).toBe(100)
    expect(levelToSkillPoints(101)).toBe(200)
    expect(levelToSkillPoints(106)).toBe(200)
  })

  it('levelToHPBase', () => {
    expect(levelToHPBase(1)).toBe(10)
    expect(levelToHPBase(50)).toBe(255)
    expect(levelToHPBase(121)).toBe(610)
    expect(levelToHPBase(200)).toBe(610)
    expect(levelToHPBase(0)).toBe(10)
  })
})
