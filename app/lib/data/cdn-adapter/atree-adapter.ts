import type { AtreeAbility, AtreeData, NormalizedText } from '~/lib/types/atree'

export interface CdnAtreeNode {
  id: number
  name: string
  description: string | NormalizedText[]
  cost: number
  location: { page: number, row: number, col: number }
  connections: number[]
  dependencies: number[]
  blockers: number[]
  archetype: string | null
  archetypeRequirement: number
  icon: string | null
  /**
   * Game-mechanics fields. Present only on wynnbuilder-backfilled snapshots —
   * the live v3 API does not ship mechanics. When absent, spell math falls back
   * to base-only damage (no upgrades applied).
   */
  effects?: unknown[]
  properties?: Record<string, unknown>
  baseAbil?: number
}

export interface CdnAtreeFile {
  nodes: CdnAtreeNode[]
}

export function adaptCdnAtree(file: CdnAtreeFile): AtreeAbility[] {
  return file.nodes.map((node): AtreeAbility => {
    const ability: AtreeAbility = {
      id: node.id,
      display_name: node.name,
      desc: node.description,
      parents: node.connections,
      dependencies: node.dependencies,
      blockers: node.blockers,
      cost: node.cost,
      archetype_req: node.archetypeRequirement,
      display: {
        page: node.location.page,
        row: node.location.row,
        col: node.location.col,
        icon: node.icon ?? null,
      },
    }

    if (node.archetype !== null && node.archetype !== '')
      ability.archetype = node.archetype

    // Game-mechanics passthrough. The math layer reads `effects` / `properties`
    // / `base_abil` verbatim; when absent (live snapshots), it falls back to
    // base spell damage with no atree upgrades.
    if (node.effects !== undefined)
      ability.effects = node.effects
    if (node.properties !== undefined)
      ability.properties = node.properties
    if (node.baseAbil !== undefined)
      ability.base_abil = node.baseAbil

    return ability
  })
}

export function mergeClassAtrees(files: Record<string, CdnAtreeFile>): AtreeData {
  return Object.fromEntries(
    Object.entries(files).map(([cls, f]) => [cls, adaptCdnAtree(f)]),
  )
}
