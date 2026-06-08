export type WynndleMode = 'weapon' | 'armor'
export type CellStatus = 'correct' | 'higher' | 'lower' | 'wrong' | 'partial'
export interface Cell { status: CellStatus, value: unknown }
export type Feedback = Record<string, Cell>
export interface GuessRecord {
  ordinal: number
  item: { id: string, name: string, rarity?: string }
  feedback: Feedback | null
}
export type HintKind = 'type' | 'levelRange' | 'rarity' | 'letter'
export interface Hint { kind: HintKind, value: string }
export interface RoundState {
  id: string
  guesses: GuessRecord[]
  hints: Hint[]
  hintsRevealed: number
  finished: boolean
  won: boolean
  answer: { id: string, name: string, rarity?: string } | null
}
export interface PuzzleMeta { id: string, mode: WynndleMode, date: string, gameVersion: string }
