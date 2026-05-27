export type WynnClass = 'Archer' | 'Warrior' | 'Mage' | 'Assassin' | 'Shaman' | 'Any'

/** A styled text segment (HTML-parsed): plain text plus optional color/font. */
export interface NormalizedText {
  color?: string
  font?: string
  text: string
}

/**
 * Raw ability node as delivered in the atree data (one entry per node).
 * `effects` / `properties` / `display` are preserved verbatim for the math and
 * UI milestones; this milestone does not interpret them.
 */
export interface AtreeAbility {
  id: number
  display_name: string
  /**
   * Rich, styled segments (NormalizedText[]) on live data; a plain string on
   * historical snapshots. The UI renders rich when it's an array.
   */
  desc: string | NormalizedText[]
  parents: number[]
  dependencies: number[]
  blockers: number[]
  cost: number
  archetype?: string
  archetype_req?: number
  base_abil?: number
  req_archetype?: string
  display?: unknown
  properties?: unknown
  effects?: unknown
}

/** Built tree node: the raw ability plus wired parent/child node references. */
export interface AtreeNode {
  ability: AtreeAbility
  parents: AtreeNode[]
  children: AtreeNode[]
}

/** Raw atree payload: class name → ordered ability list. */
export type AtreeData = Record<string, AtreeAbility[]>

/** Selection state: ability id → whether the node is actively selected. */
export type AtreeSelection = Map<number, boolean>
