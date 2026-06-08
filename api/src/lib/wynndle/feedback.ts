import type { WynndleMode } from '../../db/schema'

export interface WynndleItem {
  id: string
  name: string
  mode: WynndleMode
  rarity: 'Common' | 'Unique' | 'Rare' | 'Legendary' | 'Fabled' | 'Mythic' | 'Set'
  level: number
  powders: number
  elements: string[]
  class?: string
  dps?: number
  speed?: string
  armorType?: 'helmet' | 'chestplate' | 'leggings' | 'boots'
  health?: number
  skillReqs?: string[]
}

export type CellStatus = 'correct' | 'higher' | 'lower' | 'wrong' | 'partial'
export interface Cell { status: CellStatus, value: unknown }
export type Feedback = Record<string, Cell>

const SPEED_ORDER = ['Super Slow', 'Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast', 'Super Fast']

function num(guess: number, answer: number): Cell {
  if (guess === answer)
    return { status: 'correct', value: guess }
  return { status: guess < answer ? 'higher' : 'lower', value: guess }
}
function cat(g: unknown, a: unknown): Cell {
  return { status: g === a ? 'correct' : 'wrong', value: g }
}
function setCell(guess: string[], answer: string[]): Cell {
  const gs = new Set(guess)
  const as = new Set(answer)
  const equal = gs.size === as.size && [...gs].every(x => as.has(x))
  if (equal)
    return { status: 'correct', value: guess }
  const overlap = [...gs].some(x => as.has(x))
  return { status: overlap ? 'partial' : 'wrong', value: guess }
}

export function computeFeedback(guess: WynndleItem, answer: WynndleItem, mode: WynndleMode): Feedback {
  if (mode === 'weapon') {
    return {
      class: cat(guess.class, answer.class),
      level: num(guess.level, answer.level),
      dps: num(guess.dps ?? 0, answer.dps ?? 0),
      speed: num(SPEED_ORDER.indexOf(guess.speed ?? ''), SPEED_ORDER.indexOf(answer.speed ?? '')),
      rarity: cat(guess.rarity, answer.rarity),
      powders: num(guess.powders, answer.powders),
      elements: setCell(guess.elements, answer.elements),
    }
  }
  return {
    type: cat(guess.armorType, answer.armorType),
    level: num(guess.level, answer.level),
    health: num(guess.health ?? 0, answer.health ?? 0),
    rarity: cat(guess.rarity, answer.rarity),
    powders: num(guess.powders, answer.powders),
    elements: setCell(guess.elements, answer.elements),
    skillReqs: setCell(guess.skillReqs ?? [], answer.skillReqs ?? []),
  }
}
