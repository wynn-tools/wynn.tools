import { spriteUrl } from '~/lib/items/icon'

export interface ClassTheme {
  color: string
  light: string
  bg: string
}

export const CLASS_THEMES: Record<string, ClassTheme> = {
  Warrior: { color: 'oklch(62% 0.18 25)', light: 'oklch(72% 0.15 25)', bg: 'oklch(18% 0.06 25)' },
  Mage: { color: 'oklch(65% 0.16 230)', light: 'oklch(75% 0.13 230)', bg: 'oklch(18% 0.06 230)' },
  Archer: { color: 'oklch(65% 0.17 145)', light: 'oklch(75% 0.13 145)', bg: 'oklch(18% 0.06 145)' },
  Assassin: { color: 'oklch(72% 0.17 75)', light: 'oklch(80% 0.14 75)', bg: 'oklch(18% 0.06 75)' },
  Shaman: { color: 'oklch(65% 0.16 295)', light: 'oklch(75% 0.13 295)', bg: 'oklch(18% 0.06 295)' },
}

export const DEFAULT_CLASS_THEME: ClassTheme = {
  color: 'oklch(68% 0.16 245)',
  light: 'oklch(78% 0.13 245)',
  bg: 'oklch(20% 0.06 245)',
}

const CLASS_WEAPON: Record<string, string> = {
  Warrior: 'spear',
  Mage: 'wand',
  Archer: 'bow',
  Assassin: 'dagger',
  Shaman: 'relik',
}

export function classTheme(cls: string | null | undefined): ClassTheme {
  return (cls ? CLASS_THEMES[cls] : null) ?? DEFAULT_CLASS_THEME
}

export function classWeaponUrl(cls: string): string {
  return spriteUrl(CLASS_WEAPON[cls] ?? 'spear')
}
