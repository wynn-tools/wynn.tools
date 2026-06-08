import type { Db } from '../db/client'
import type { WynndleMode } from '../db/schema'
import type { WynndleItem } from '../lib/wynndle/feedback'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { and, eq } from 'drizzle-orm'
import seedrandom from 'seedrandom'
import { wynndlePuzzles } from '../db/schema'

interface Deps {
  db: Db
  poolService: { getPool: (mode: WynndleMode, gameVersion: string) => Promise<WynndleItem[]> }
  resolveCurrentVersion: () => Promise<string>
}

export function createPuzzleService({ db, poolService, resolveCurrentVersion }: Deps) {
  return {
    async getOrCreateToday(mode: WynndleMode, date: string) {
      const existing = await db.select().from(wynndlePuzzles).where(and(eq(wynndlePuzzles.mode, mode), eq(wynndlePuzzles.date, date))).limit(1)
      if (existing[0])
        return existing[0]
      const gameVersion = process.env.WYNNDLE_PIN_VERSION ?? await resolveCurrentVersion()
      const pool = await poolService.getPool(mode, gameVersion)
      if (pool.length === 0)
        throw new Error('empty pool')
      const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id))
      const rng = seedrandom(`${mode}:${date}`)
      const pick = sorted[Math.floor(rng() * sorted.length)]
      try {
        const [row] = await db.insert(wynndlePuzzles).values({
          id: randomUUID(),
          mode,
          date,
          itemId: pick.id,
          itemName: pick.name,
          itemRarity: pick.rarity,
          gameVersion,
        }).returning()
        return row
      }
      catch {
        const [row] = await db.select().from(wynndlePuzzles).where(and(eq(wynndlePuzzles.mode, mode), eq(wynndlePuzzles.date, date))).limit(1)
        if (!row)
          throw new Error('puzzle race lost')
        return row
      }
    },
  }
}
