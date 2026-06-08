import { beforeEach, expect, it } from 'vitest'
import { getDb } from '../src/db/client'
import { wynndlePuzzles } from '../src/db/schema'
import { createPuzzleService } from '../src/services/wynndle-puzzle'

const db = getDb()

beforeEach(async () => {
  await db.delete(wynndlePuzzles)
})

const pool = [
  { id: 'A', name: 'A', mode: 'weapon' as const, rarity: 'Mythic' as const, level: 1, powders: 0, elements: [] },
  { id: 'B', name: 'B', mode: 'weapon' as const, rarity: 'Mythic' as const, level: 1, powders: 0, elements: [] },
  { id: 'C', name: 'C', mode: 'weapon' as const, rarity: 'Mythic' as const, level: 1, powders: 0, elements: [] },
]

const deps = {
  db,
  poolService: { getPool: async () => pool },
  resolveCurrentVersion: async () => '2.2.0.31',
}

it('idempotent: two calls produce the same row', async () => {
  const svc = createPuzzleService(deps)
  const p1 = await svc.getOrCreateToday('weapon', '2026-06-08')
  const p2 = await svc.getOrCreateToday('weapon', '2026-06-08')
  expect(p1.id).toBe(p2.id)
  expect(p1.itemId).toBe(p2.itemId)
})

it('deterministic: same date+mode -> same item even after delete', async () => {
  const svc = createPuzzleService(deps)
  const p1 = await svc.getOrCreateToday('weapon', '2026-06-08')
  await db.delete(wynndlePuzzles)
  const p2 = await svc.getOrCreateToday('weapon', '2026-06-08')
  expect(p2.itemId).toBe(p1.itemId)
})

it('different dates likely pick different items (or at least both succeed)', async () => {
  const svc = createPuzzleService(deps)
  const a = await svc.getOrCreateToday('weapon', '2026-06-08')
  const b = await svc.getOrCreateToday('weapon', '2026-06-09')
  expect(a.itemId).toBeDefined()
  expect(b.itemId).toBeDefined()
})
