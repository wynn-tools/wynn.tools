// app/lib/math/skillpoint-calc.ts
import type { ItemSet } from '../types/item'
import type { ExpandedItem } from './expand-item'
import { SKP_ORDER } from './constants'

export interface SkillpointResult {
  /** Optimal equip order (faithful: includes NONE/tome entries; caller filters for display). */
  equipOrder: ExpandedItem[]
  /** Skillpoints the player had to manually assign, per skill [str,dex,int,def,agi]. */
  baseSkillpoints: number[]
  /** Final skillpoint totals including item + set contributions. */
  finalSkillpoints: number[]
  /** Sum of baseSkillpoints (single number). */
  assignedTotal: number
  /** Set name → equipped piece count. */
  activeSetCounts: Map<string, number>
  /** Total skillpoints contributed by items + sets (used for radiance), per skill. */
  totalItemSkillpoints: number[]
}

type Vec5 = number[]

function getReqs(item: ExpandedItem): Vec5 {
  return (item.get('reqs') as Vec5 | undefined) ?? [0, 0, 0, 0, 0]
}
function getSkillpoints(item: ExpandedItem): Vec5 {
  return (item.get('skillpoints') as Vec5 | undefined) ?? [0, 0, 0, 0, 0]
}
function isCrafted(item: ExpandedItem): boolean {
  return Boolean(item.get('crafted'))
}

function vadd5(a: Vec5, b: Vec5): Vec5 {
  const res = [0, 0, 0, 0, 0]
  for (let i = 0; i < 5; ++i)
    res[i] = a[i]! + b[i]!
  return res
}

/** Apply an item's skillpoint bonuses + advance its set count. Mutates skillpoints + setCounts. */
function applySkillpoints(skillpoints: Vec5, item: ExpandedItem, setCounts: Map<string, number>): void {
  const sp = getSkillpoints(item)
  for (let i = 0; i < 5; i++)
    skillpoints[i] = skillpoints[i]! + sp[i]!
  const setName = item.get('set') as string | null | undefined
  if (setName) {
    const setCount = setCounts.get(setName)
    if (setCount)
      setCounts.set(setName, setCount + 1)
    else
      setCounts.set(setName, 1)
  }
}

function canEquip(skillpoints: Vec5, item: ExpandedItem): boolean {
  const reqs = getReqs(item)
  for (let i = 0; i < 5; i++) {
    if (reqs[i]! <= 0)
      continue
    if (reqs[i]! > skillpoints[i]!)
      return false
  }
  return true
}

/** If an already-equipped item would pop off, re-assign points to keep it on. Mutates skillpoints. */
function fixShouldPop(skillpoints: Vec5, item: ExpandedItem): Vec5 {
  const applied = [0, 0, 0, 0, 0]
  const reqs = getReqs(item)
  const sp = getSkillpoints(item)
  for (let i = 0; i < 5; ++i) {
    if (reqs[i]! <= 0)
      continue
    const req = isCrafted(item) ? reqs[i]! : reqs[i]! + sp[i]!
    const cur = skillpoints[i]!
    if (req > cur) {
      const diff = req - cur
      applied[i]! += diff
      skillpoints[i] = skillpoints[i]! + diff
    }
  }
  return applied
}

function checkUnder100(skillpoints: Vec5): boolean {
  for (let i = 0; i < 5; ++i) {
    if (skillpoints[i]! > 100)
      return false
  }
  return true
}

/** Assign just enough points to wear `item`. Mutates skillpoints, returns the deltas applied. */
function applyToFit(skillpoints: Vec5, item: ExpandedItem): Vec5 {
  const applied = [0, 0, 0, 0, 0]
  const reqs = getReqs(item)
  for (let i = 0; i < 5; i++) {
    if (reqs[i]! <= 0)
      continue
    const req = reqs[i]!
    const cur = skillpoints[i]!
    if (req > cur) {
      const diff = req - cur
      applied[i]! += diff
      skillpoints[i] = skillpoints[i]! + diff
    }
  }
  return applied
}

/**
 * Compute optimal equip order + skillpoint assignment.
 * Pure port of skillpoints.js calculate_skillpoints (instrumentation removed).
 */
export function calculateSkillpoints(
  equipment: ExpandedItem[],
  weapon: ExpandedItem,
  sets: Map<string, ItemSet>,
): SkillpointResult {
  const craftedItems: ExpandedItem[] = []
  const totalItemSkillpoints: Vec5 = [0, 0, 0, 0, 0]

  const weaponSp = getSkillpoints(weapon)
  for (let i = 0; i < 5; i++)
    totalItemSkillpoints[i]! += weaponSp[i]!

  for (const item of equipment) {
    if (isCrafted(item))
      craftedItems.push(item)
    const sp = getSkillpoints(item)
    for (let i = 0; i < 5; i++)
      totalItemSkillpoints[i]! += sp[i]!
  }

  let bestSkillpoints: Vec5 = [0, 0, 0, 0, 0]
  let finalSkillpoints: Vec5 = [0, 0, 0, 0, 0]
  let bestTotal = Infinity
  let bestUnder100 = false
  let bestActiveSetCounts = new Map<string, number>()
  let bestOrder: ExpandedItem[] = equipment

  function recurseCheck(
    applied_: Vec5,
    skpTotals: Vec5,
    sets_: Map<string, number>,
    totalApplied_: number,
    skippedStates: Vec5[],
    priorSkipped: number[],
    equippedItems: number[],
    remainsInOrder: number[],
  ): void {
    if (remainsInOrder.length === 1) {
      const item = equipment[remainsInOrder[0]!]!
      const skillpoints = skpTotals.slice()

      const deltas1 = applyToFit(skillpoints, item)
      const setsCopy = new Map(sets_)
      if (!isCrafted(item))
        applySkillpoints(skillpoints, item, setsCopy)
      const deltas2 = applyToFit(skillpoints, weapon)
      let deltas = vadd5(deltas1, deltas2)

      for (let i = 0; i < equipment.length; ++i) {
        const _delta = fixShouldPop(skillpoints, equipment[i]!)
        deltas = vadd5(deltas, _delta)
      }
      for (let j = 0; j < priorSkipped.length; ++j) {
        const simSkillpoints = vadd5(skippedStates[j]!, deltas)
        if (canEquip(simSkillpoints, equipment[priorSkipped[j]!]!))
          return
      }
      const applied = vadd5(applied_, deltas)
      const totalApplied = totalApplied_ + deltas.reduce((a, b) => a + b, 0)

      const solnUnder100 = checkUnder100(applied)
      if (bestUnder100 && !solnUnder100)
        return
      if (totalApplied < bestTotal || (solnUnder100 && !bestUnder100)) {
        for (const crafted of craftedItems)
          applySkillpoints(skillpoints, crafted, setsCopy)
        applySkillpoints(skillpoints, weapon, setsCopy)

        finalSkillpoints = skillpoints
        bestSkillpoints = applied
        bestTotal = totalApplied
        bestActiveSetCounts = setsCopy
        bestOrder = equippedItems.concat([remainsInOrder[0]!]).map(x => equipment[x]!)
        bestUnder100 = solnUnder100
      }
      return
    }

    for (let i = 0; i < remainsInOrder.length; ++i) {
      const head = remainsInOrder.slice(0, i)
      const skipped = priorSkipped.concat(head)

      const skillpoints = skpTotals.slice()
      const item = equipment[remainsInOrder[i]!]!
      const deltas = applyToFit(skillpoints, item)
      const simStates: Vec5[] = []
      let rejected = false
      for (let j = 0; j < priorSkipped.length; ++j) {
        const simSkillpoints = vadd5(skippedStates[j]!, deltas)
        if (canEquip(simSkillpoints, equipment[priorSkipped[j]!]!)) {
          rejected = true
          break
        }
        simStates.push(simSkillpoints)
      }
      if (rejected)
        continue
      for (let j = 0; j < head.length; ++j) {
        if (canEquip(skillpoints, equipment[head[j]!]!)) {
          rejected = true
          break
        }
        simStates.push(skillpoints)
      }
      if (rejected)
        continue

      const modSkillpoints = skillpoints.slice()
      const setsCopy = new Map(sets_)
      if (!isCrafted(item))
        applySkillpoints(modSkillpoints, item, setsCopy)
      const applied = vadd5(applied_, deltas)
      const totalApplied = totalApplied_ + deltas.reduce((a, b) => a + b, 0)
      const tail = remainsInOrder.slice(i + 1, remainsInOrder.length)
      const remains = tail.concat(head)

      recurseCheck(
        applied,
        modSkillpoints,
        setsCopy,
        totalApplied,
        simStates,
        skipped,
        equippedItems.concat([remainsInOrder[i]!]),
        remains,
      )
    }
  }

  const startOrder = equipment.map((_, i) => i)
  recurseCheck([0, 0, 0, 0, 0], [0, 0, 0, 0, 0], new Map(), 0, [], [], [], startOrder)

  for (const [setName, count] of bestActiveSetCounts) {
    const bonus = sets.get(setName)!.bonuses[count - 1]!
    for (let i = 0; i < SKP_ORDER.length; i++) {
      const delta = bonus[SKP_ORDER[i]!] ?? 0
      finalSkillpoints[i] = finalSkillpoints[i]! + delta
      totalItemSkillpoints[i] = totalItemSkillpoints[i]! + delta
    }
  }

  return {
    equipOrder: bestOrder,
    baseSkillpoints: bestSkillpoints,
    finalSkillpoints,
    assignedTotal: bestTotal === Infinity ? 0 : bestTotal,
    activeSetCounts: bestActiveSetCounts,
    totalItemSkillpoints,
  }
}
