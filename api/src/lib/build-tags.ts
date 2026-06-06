export type TagAxis = 'role' | 'playstyle' | 'content' | 'budget' | 'misc'

export interface CuratedTag {
  label: string
  axis: TagAxis
  aliases?: string[]
}

export const BUILD_TAGS: Record<string, CuratedTag> = {
  'dps': { label: 'DPS', axis: 'role' },
  'tank': { label: 'Tank', axis: 'role' },
  'healer': { label: 'Healer', axis: 'role', aliases: ['heal'] },
  'support': { label: 'Support', axis: 'role' },
  'hybrid': { label: 'Hybrid', axis: 'role' },
  'glass': { label: 'Glass Cannon', axis: 'role' },
  'spellspam': { label: 'Spell Spam', axis: 'playstyle' },
  'melee': { label: 'Melee', axis: 'playstyle' },
  'manasteal': { label: 'Mana Steal', axis: 'playstyle', aliases: ['mana steal'] },
  'spellsteal': { label: 'Spell Steal', axis: 'playstyle' },
  'lifesteal': { label: 'Life Steal', axis: 'playstyle', aliases: ['life steal'] },
  'mana-regen': { label: 'Mana Regen', axis: 'playstyle', aliases: ['mr'] },
  'hpr': { label: 'HPR', axis: 'playstyle' },
  'sustain': { label: 'Sustain', axis: 'playstyle' },
  'walk-speed': { label: 'Walk Speed', axis: 'playstyle', aliases: ['ws'] },
  'lockdown': { label: 'Lockdown', axis: 'playstyle' },
  'rainbow': { label: 'Rainbow', axis: 'playstyle' },
  'mixed-mana': { label: 'Mixed Mana', axis: 'playstyle' },
  'raid': { label: 'Raids', axis: 'content', aliases: ['raids'] },
  'world-event': { label: 'World Events', axis: 'content', aliases: ['world events', 'world event'] },
  'lootrun': { label: 'Lootruns', axis: 'content' },
  'tna': { label: 'TNA', axis: 'content' },
  'tcc': { label: 'TCC', axis: 'content' },
  'notg': { label: 'NOTG', axis: 'content' },
  'nol': { label: 'NOL', axis: 'content' },
  'leveling': { label: 'Leveling', axis: 'content', aliases: ['levelling'] },
  'grinding': { label: 'Grinding', axis: 'content' },
  'bossing': { label: 'Bossing', axis: 'content' },
  'budget': { label: 'Budget', axis: 'budget' },
  'cheap': { label: 'Cheap', axis: 'budget' },
  'crafted': { label: 'Crafted', axis: 'budget' },
  'tome-needed': { label: 'Tome Needed', axis: 'budget' },
  'tierstack': { label: 'Tier-Stacked', axis: 'budget', aliases: ['tstack'] },
  'end-game': { label: 'Endgame', axis: 'budget' },
  'silly': { label: 'Silly', axis: 'misc' },
  'qol': { label: 'QoL', axis: 'misc' },
  'meta': { label: 'Meta', axis: 'misc' },
}

export const DENY_TAGS = new Set<string>([
  'mage',
  'shaman',
  'warrior',
  'archer',
  'assassin',
  'riftwalker',
  'arcanist',
  'sorcerer',
  'sorcery',
  'lightbender',
  'boltslinger',
  'fallen',
  'trickster',
  'trapper',
  'summoner',
  'sharpshooter',
  'paladin',
  'acolyte',
  'battlemonk',
  'acrobat',
  'shadestepper',
  'ritualist',
  'riftbender',
  'warchief',
  'hero',
  'guardian',
])

export const TAG_LIMITS = {
  MAX_PER_BUILD: 8,
  MAX_TAG_LENGTH: 24,
} as const

export function normalizeTags(raw: readonly string[]): string[] {
  const aliasMap = new Map<string, string>()
  for (const [slug, def] of Object.entries(BUILD_TAGS)) {
    for (const a of def.aliases ?? []) aliasMap.set(a.toLowerCase().trim(), slug)
  }

  const out: string[] = []
  const seen = new Set<string>()
  for (const r of raw) {
    if (typeof r !== 'string')
      continue
    const trimmedLower = r.trim().toLowerCase()
    if (!trimmedLower)
      continue
    let s = trimmedLower.replace(/\s+/g, '-')
    s = aliasMap.get(trimmedLower) ?? s
    if (DENY_TAGS.has(s))
      continue
    if (s.length > TAG_LIMITS.MAX_TAG_LENGTH)
      continue
    if (seen.has(s))
      continue
    seen.add(s)
    out.push(s)
    if (out.length >= TAG_LIMITS.MAX_PER_BUILD)
      break
  }
  return out
}

export function tagDisplayLabel(slug: string): string {
  return BUILD_TAGS[slug]?.label ?? slug
}

export function tagAxis(slug: string): TagAxis | null {
  return BUILD_TAGS[slug]?.axis ?? null
}
