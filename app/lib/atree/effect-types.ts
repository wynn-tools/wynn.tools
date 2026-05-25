// app/lib/atree/effect-types.ts

/** One stat/prop bonus inside a raw_stat effect. */
export interface RawStatBonus {
  type: 'stat' | 'prop'
  name: string
  abil?: string
  value: number
}

/** Flat stat bonuses applied to the build stat map. */
export interface RawStatEffect {
  type: 'raw_stat'
  /** Slider/toggle id, or false/absent for always-on. Toggled effects handled in 5f-3. */
  toggle?: string | false
  bonuses: RawStatBonus[]
}

/** Any effect type we don't interpret yet (replace_spell, add_spell_prop, stat_scaling, ...). */
export interface OpaqueEffect {
  type: string
  [key: string]: unknown
}

export type AtreeEffect = RawStatEffect | OpaqueEffect

/** A merged ability: its effects (concatenated across base_abil merges) + summed properties. */
export interface MergedAbility {
  id: number
  effects: AtreeEffect[]
  properties: Record<string, number>
}

/**
 * Per-class default abilities (melee id 999 + elemental mastery id 998).
 * Port of atree.js default_abils — minimal: the default melee SPELL is seeded
 * separately from DEFAULT_SPELLS in 5f-2, so these carry no spell effects here.
 * `properties` keep the melee range/speed verbatim (inert in current scope).
 */
export const DEFAULT_ABILITIES: Record<string, MergedAbility[]> = {
  Mage: [{ id: 999, effects: [], properties: { range: 12 } }, { id: 998, effects: [], properties: {} }],
  Warrior: [{ id: 999, effects: [], properties: { range: 4 } }, { id: 998, effects: [], properties: {} }],
  Archer: [{ id: 999, effects: [], properties: { range: 9 } }, { id: 998, effects: [], properties: {} }],
  Assassin: [{ id: 999, effects: [], properties: { range: 3 } }, { id: 998, effects: [], properties: {} }],
  Shaman: [{ id: 999, effects: [], properties: { range: 32.25, speed: 0 } }, { id: 998, effects: [], properties: {} }],
}
