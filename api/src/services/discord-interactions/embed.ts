const RARITY_COLOR: Record<string, number> = {
  common: 0xFFFFFF,
  set: 0x55FF55,
  unique: 0xFFFF55,
  rare: 0xFF55FF,
  legendary: 0x55FFFF,
  fabled: 0xFF5555,
  mythic: 0xAA00AA,
}

export function rarityColor(rarity: string): number {
  return RARITY_COLOR[rarity.toLowerCase()] ?? 0xAAAAAA
}

export const POWERED_BY_WYNNVENTORY = { text: 'Powered by WynnVentory' }
export const EPHEMERAL_FLAG = 64
