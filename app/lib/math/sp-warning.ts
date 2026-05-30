// app/lib/math/sp-warning.ts
//
// Feasibility classification for a build's skill-point assignment, mirroring the
// states WynnBuilder surfaces on its skill-point box:
//
//   ok           — wearable on assigned points alone.
//   needs-tomes  — only wearable because the equipped Guild Tome contributes
//                  skill points (the community "gtome" warning). Without it the
//                  build would be short or breach the per-skill cap.
//   over-cap     — a single skill needs more than 100 assigned points, which the
//                  game does not allow, so the build is unwearable as built.
//   insufficient — the level does not grant enough points to meet requirements.
//
// Pure: takes the primary skillpoint result, an optional "without guild tome"
// result (only computed when a guild tome supplies points), the available pool,
// and the guild tome's per-skill contribution.

import type { SkillpointResult } from './skillpoint-calc'

export type SpStatus = 'ok' | 'needs-tomes' | 'over-cap' | 'insufficient'

export const SP_SKILL_NAMES = ['Strength', 'Dexterity', 'Intelligence', 'Defence', 'Agility'] as const

/** Per-skill assigned cap. The game refuses manual assignment beyond this. */
export const SP_PER_SKILL_CAP = 100

export interface SpWarning {
  status: SpStatus
  /** Minimum points that must be manually assigned to wear everything. */
  required: number
  available: number
  /** available − required (negative when short). */
  remaining: number
  /** Per-skill minimum assignment [str,dex,int,def,agi]. */
  perSkill: number[]
  /** Skill indices whose assignment exceeds the 100 cap. */
  overCapSkills: number[]
  /** Per-skill points supplied by the equipped guild tome. */
  tomeContribution: number[]
  /** One-line summary (empty for `ok`). */
  message: string
  /** Longer hover detail (empty for `ok`). */
  detail: string
}

function isFeasible(result: SkillpointResult, available: number): boolean {
  if (result.assignedTotal > available)
    return false
  return result.baseSkillpoints.every(v => v <= SP_PER_SKILL_CAP)
}

function listSkills(indices: number[]): string {
  return indices.map(i => SP_SKILL_NAMES[i]).join(', ')
}

/** Skills the guild tome covers: it contributes points and the build leans on them. */
function coveredSkills(tomeContribution: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < tomeContribution.length; i++) {
    if ((tomeContribution[i] ?? 0) > 0)
      out.push(i)
  }
  return out
}

export function computeSpWarning(
  skp: SkillpointResult,
  /** Recomputed result excluding the guild tome, or null when no guild tome supplies points. */
  skpNoGuild: SkillpointResult | null,
  available: number,
  /** Guild tome's per-skill skill-point contribution [str,dex,int,def,agi]. */
  tomeContribution: number[] = [0, 0, 0, 0, 0],
): SpWarning {
  const required = skp.assignedTotal
  const remaining = available - required
  const perSkill = skp.baseSkillpoints
  const overCapSkills: number[] = []
  for (let i = 0; i < perSkill.length; i++) {
    if ((perSkill[i] ?? 0) > SP_PER_SKILL_CAP)
      overCapSkills.push(i)
  }

  const base: Omit<SpWarning, 'status' | 'message' | 'detail'> = {
    required,
    available,
    remaining,
    perSkill,
    overCapSkills,
    tomeContribution,
  }

  // Over the per-skill cap: unwearable regardless of how many points you have.
  if (overCapSkills.length > 0) {
    const names = listSkills(overCapSkills)
    const worst = Math.max(...overCapSkills.map(i => perSkill[i] ?? 0))
    return {
      ...base,
      status: 'over-cap',
      message: `Over the ${SP_PER_SKILL_CAP}-point cap in ${names}`,
      detail: `${names} needs ${worst} assigned points, but a single skill can hold at most ${SP_PER_SKILL_CAP}. This build can't be worn as configured.`,
    }
  }

  // Not enough points at this level.
  if (remaining < 0) {
    return {
      ...base,
      status: 'insufficient',
      message: `${-remaining} skill point${remaining === -1 ? '' : 's'} short`,
      detail: `Needs ${required} assigned skill points, but your level grants only ${available}. You're ${-remaining} short.`,
    }
  }

  // Feasible as equipped. If a guild tome supplies points and the build would be
  // infeasible without it, flag the dependency (the "gtome" warning).
  if (skpNoGuild && !isFeasible(skpNoGuild, available)) {
    const covered = coveredSkills(tomeContribution)
    const parts = covered.map(i => `+${tomeContribution[i]} ${SP_SKILL_NAMES[i]}`)
    const withoutShort = skpNoGuild.assignedTotal - available
    const why = withoutShort > 0
      ? `Without it you'd be ${withoutShort} skill point${withoutShort === 1 ? '' : 's'} short.`
      : `Without it a skill would exceed the ${SP_PER_SKILL_CAP}-point cap.`
    return {
      ...base,
      status: 'needs-tomes',
      message: 'Requires your Guild Tome',
      detail: `Wearable only with the equipped Guild Tome (${parts.join(', ') || 'skill points'}). ${why}`,
    }
  }

  return {
    ...base,
    status: 'ok',
    message: '',
    detail: '',
  }
}
