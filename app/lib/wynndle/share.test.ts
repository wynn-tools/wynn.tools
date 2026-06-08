import type { RoundState } from './types'
import { describe, expect, it } from 'vitest'
import { buildShareGrid } from './share'

const ROUND: RoundState = {
  id: 'r',
  guesses: [
    { ordinal: 1, item: { id: 'a', name: 'A' }, feedback: { class: { status: 'wrong', value: '' }, level: { status: 'higher', value: 1 } } },
    { ordinal: 2, item: { id: 'b', name: 'B' }, feedback: { class: { status: 'correct', value: '' }, level: { status: 'correct', value: 1 } } },
  ],
  hints: [{ kind: 'type', value: 'Archer' }],
  hintsRevealed: 1,
  finished: true,
  won: true,
  answer: { id: 'b', name: 'B' },
}

describe('buildShareGrid', () => {
  it('emits header with puzzle number, score, hint count', () => {
    const out = buildShareGrid(ROUND, 'weapon', { puzzleNumber: 42 })
    expect(out).toContain('Wynndle Weapon #42')
    expect(out).toContain('2/10')
    expect(out).toContain('(1 hint)')
  })
  it('emits one emoji row per guess', () => {
    const out = buildShareGrid(ROUND, 'weapon', { puzzleNumber: 42 })
    const rows = out.split('\n').filter(l => /^[🟩🟨⬛🔼🔽]+$/u.test(l))
    expect(rows.length).toBe(2)
  })
  it('does not leak answer or guess names', () => {
    const out = buildShareGrid(ROUND, 'weapon', { puzzleNumber: 42 })
    expect(out).not.toContain('A')
    expect(out).not.toContain('B')
  })
  it('uses X/10 on loss', () => {
    const out = buildShareGrid({ ...ROUND, won: false }, 'armor', { puzzleNumber: 7 })
    expect(out).toContain('Wynndle Armor #7 — X/10')
  })
  it('uses plural hints', () => {
    const out = buildShareGrid({ ...ROUND, hintsRevealed: 2 }, 'weapon', { puzzleNumber: 1 })
    expect(out).toContain('(2 hints)')
  })
})
