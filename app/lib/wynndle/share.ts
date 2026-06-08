import type { CellStatus, RoundState, WynndleMode } from './types'

const EMOJI: Record<CellStatus, string> = {
  correct: '🟩',
  partial: '🟨',
  wrong: '⬛',
  higher: '🔼',
  lower: '🔽',
}

export function buildShareGrid(
  round: RoundState,
  mode: WynndleMode,
  opts: { puzzleNumber: number, baseUrl?: string } = { puzzleNumber: 0 },
): string {
  const modeLabel = mode === 'weapon' ? 'Weapon' : 'Armor'
  const score = round.won ? `${round.guesses.length}/10` : 'X/10'
  const hintLine = round.hintsRevealed > 0
    ? ` (${round.hintsRevealed} hint${round.hintsRevealed === 1 ? '' : 's'})`
    : ''
  const header = `Wynndle ${modeLabel} #${opts.puzzleNumber} — ${score}${hintLine}`
  const rows = round.guesses.map(g =>
    Object.values(g.feedback ?? {}).map(c => EMOJI[c.status]).join(''),
  )
  const url = `${opts.baseUrl ?? 'https://wynn.tools'}/play/wynndle`
  return [header, ...rows, url].join('\n')
}
