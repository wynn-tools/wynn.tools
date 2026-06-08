import type { Context } from 'hono'
import type { WynndleMode } from '../db/schema'
import type { WynndleItem } from '../lib/wynndle/feedback'
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { getDb } from '../db/client'
import { users, wynndleGuesses, wynndleMode, wynndlePuzzles, wynndleRounds, wynndleStreaks } from '../db/schema'
import { env } from '../env'
import { computeFeedback } from '../lib/wynndle/feedback'
import { deriveHint } from '../lib/wynndle/hints'
import { verifyApiKey } from '../services/api-keys'
import { getSessionUser } from '../services/sessions'
import { createPoolService } from '../services/wynndle-pool'
import { createPuzzleService } from '../services/wynndle-puzzle'
import { recordResult } from '../services/wynndle-streak'
import { createVersionsResolver } from '../services/wynndle-versions'

const MAX_GUESSES = 10
const HINT_GATES = [0, 2, 4, 6, 8]

type Db = ReturnType<typeof getDb>
type PuzzleRow = typeof wynndlePuzzles.$inferSelect
type RoundRow = typeof wynndleRounds.$inferSelect
interface PoolService { getPool: (mode: WynndleMode, gameVersion: string) => Promise<WynndleItem[]> }
interface PuzzleService { getOrCreateToday: (mode: WynndleMode, date: string) => Promise<PuzzleRow> }

type StreakRecorder = (userId: string, mode: WynndleMode, date: string, won: boolean) => Promise<void>

interface Deps {
  db: Db
  poolService: PoolService
  puzzleService: PuzzleService
  streakRecorder?: StreakRecorder
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

async function resolveUser(c: Context): Promise<{ id: string } | null> {
  const bearer = c.req.header('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (bearer) {
    const verified = await verifyApiKey(bearer)
    if (verified)
      return { id: verified.user.id }
  }
  const token = getCookie(c, 'session')
  if (token) {
    const u = await getSessionUser(token)
    if (u)
      return { id: u.id }
  }
  return null
}

export function createWynndleRoute({
  db,
  poolService,
  puzzleService,
  streakRecorder = (userId, mode, date, won) => recordResult(db, userId, mode, date, won),
}: Deps): Hono {
  const app = new Hono()

  async function findRound(c: Context, puzzleId: string): Promise<RoundRow | null> {
    const user = await resolveUser(c)
    if (user) {
      const [r] = await db.select().from(wynndleRounds).where(and(eq(wynndleRounds.puzzleId, puzzleId), eq(wynndleRounds.userId, user.id))).limit(1)
      return r ?? null
    }
    const anonKey = c.req.header('x-anon-key')
    if (!anonKey)
      return null
    const [r] = await db.select().from(wynndleRounds).where(and(eq(wynndleRounds.puzzleId, puzzleId), eq(wynndleRounds.anonKey, anonKey))).limit(1)
    return r ?? null
  }

  async function materializeRound(round: RoundRow, puzzle: PuzzleRow) {
    const guesses = await db.select().from(wynndleGuesses).where(eq(wynndleGuesses.roundId, round.id)).orderBy(asc(wynndleGuesses.ordinal))
    const pool = await poolService.getPool(puzzle.mode, puzzle.gameVersion)
    const answer = pool.find(i => i.id === puzzle.itemId) ?? null
    const guessOut = guesses.map((g) => {
      const item = pool.find(i => i.id === g.itemId)
      const feedback = item && answer ? computeFeedback(item, answer, puzzle.mode) : null
      // Prefer the denormalized rarity on the guess row so historical rounds
      // survive pool drift. Fall back to the pool item when the column is
      // null (pre-migration rows) or missing.
      const rarity = g.itemRarity ?? item?.rarity
      return {
        ordinal: g.ordinal,
        item: { id: g.itemId, name: item?.name ?? g.itemName, rarity },
        feedback,
      }
    })
    const hints = []
    if (answer) {
      const n = Math.max(0, Math.min(4, round.hintsRevealed))
      for (let i = 1; i <= n; i++)
        hints.push(deriveHint(answer, i as 1 | 2 | 3 | 4))
    }
    const finished = round.finished === 1
    const won = round.won === 1
    return {
      id: round.id,
      guesses: guessOut,
      hints,
      hintsRevealed: round.hintsRevealed,
      finished,
      won,
      // Same denormalization story as guess identity: prefer the column,
      // fall back to the live pool entry. Surfaces rarity to the client so
      // the win/loss reveal can render the answer in its rarity color.
      answer: finished && answer
        ? { id: answer.id, name: answer.name, rarity: puzzle.itemRarity ?? answer.rarity }
        : null,
    }
  }

  app.get('/today', async (c) => {
    const mode = c.req.query('mode') as WynndleMode | undefined
    if (!mode || !(wynndleMode as readonly string[]).includes(mode))
      return c.json({ error: 'bad mode' }, 400)
    const puzzle = await puzzleService.getOrCreateToday(mode, todayUtc())
    const round = await findRound(c, puzzle.id)
    return c.json({
      puzzle: {
        id: puzzle.id,
        mode: puzzle.mode,
        date: puzzle.date,
        gameVersion: puzzle.gameVersion,
      },
      round: round ? await materializeRound(round, puzzle) : null,
    })
  })

  app.post('/guess', async (c) => {
    let body: { mode?: unknown, itemId?: unknown }
    try {
      body = await c.req.json()
    }
    catch {
      return c.json({ error: 'bad json' }, 400)
    }
    const mode = body.mode
    const itemId = body.itemId
    if (typeof mode !== 'string' || !(wynndleMode as readonly string[]).includes(mode))
      return c.json({ error: 'bad mode' }, 400)
    if (typeof itemId !== 'string' || !itemId)
      return c.json({ error: 'bad itemId' }, 400)
    const m = mode as WynndleMode

    const puzzle = await puzzleService.getOrCreateToday(m, todayUtc())
    const pool = await poolService.getPool(m, puzzle.gameVersion)
    const guessed = pool.find(i => i.id === itemId)
    if (!guessed)
      return c.json({ error: 'item not in pool' }, 400)

    const user = await resolveUser(c)
    const anonKey = c.req.header('x-anon-key') ?? null
    if (!user && !anonKey)
      return c.json({ error: 'auth required' }, 400)

    let round: RoundRow | null = null
    const inserted = await db.insert(wynndleRounds).values({
      id: randomUUID(),
      puzzleId: puzzle.id,
      userId: user?.id ?? null,
      anonKey: user ? null : anonKey,
    }).onConflictDoNothing().returning()
    if (inserted[0]) {
      round = inserted[0]
    }
    else {
      round = await findRound(c, puzzle.id)
    }
    if (!round)
      return c.json({ error: 'round not found' }, 500)

    if (round.finished === 1 || round.guessCount >= MAX_GUESSES)
      return c.json({ error: 'round finished' }, 409)

    const ordinal = round.guessCount + 1
    await db.insert(wynndleGuesses).values({
      id: randomUUID(),
      roundId: round.id,
      ordinal,
      itemId: guessed.id,
      itemName: guessed.name,
      itemRarity: guessed.rarity,
    })

    const won = guessed.id === puzzle.itemId
    const finished = won || ordinal >= MAX_GUESSES
    await db.update(wynndleRounds).set({
      guessCount: ordinal,
      won: won ? 1 : 0,
      finished: finished ? 1 : 0,
      solvedAt: won ? new Date() : round.solvedAt,
    }).where(eq(wynndleRounds.id, round.id))

    if (finished && user)
      await streakRecorder(user.id, m, puzzle.date, won)

    const [fresh] = await db.select().from(wynndleRounds).where(eq(wynndleRounds.id, round.id)).limit(1)
    if (!fresh)
      return c.json({ error: 'round vanished' }, 500)

    return c.json({
      puzzle: {
        id: puzzle.id,
        mode: puzzle.mode,
        date: puzzle.date,
        gameVersion: puzzle.gameVersion,
      },
      round: await materializeRound(fresh, puzzle),
    })
  })

  app.get('/leaderboard', async (c) => {
    const mode = c.req.query('mode') as WynndleMode | undefined
    if (!mode || !(wynndleMode as readonly string[]).includes(mode))
      return c.json({ error: 'bad mode' }, 400)
    const m = mode as WynndleMode
    const date = c.req.query('date') ?? todayUtc()
    const [puzzle] = await db.select().from(wynndlePuzzles).where(and(eq(wynndlePuzzles.mode, m), eq(wynndlePuzzles.date, date))).limit(1)
    const dailyRows = puzzle
      ? await db.select({
          username: users.username,
          guesses: wynndleRounds.guessCount,
          hints: wynndleRounds.hintsRevealed,
          startedAt: wynndleRounds.startedAt,
          solvedAt: wynndleRounds.solvedAt,
        })
          .from(wynndleRounds)
          .innerJoin(users, eq(users.id, wynndleRounds.userId))
          .where(and(eq(wynndleRounds.puzzleId, puzzle.id), eq(wynndleRounds.won, 1)))
          .orderBy(
            sql`(${wynndleRounds.guessCount} + ${wynndleRounds.hintsRevealed}) asc`,
            sql`coalesce(${wynndleRounds.solvedAt} - ${wynndleRounds.startedAt}, interval '0') asc`,
          )
          .limit(50)
      : []
    const streakRows = await db.select({
      username: users.username,
      current: wynndleStreaks.current,
      longest: wynndleStreaks.longest,
    })
      .from(wynndleStreaks)
      .innerJoin(users, eq(users.id, wynndleStreaks.userId))
      .where(eq(wynndleStreaks.mode, m))
      .orderBy(desc(wynndleStreaks.longest))
      .limit(50)
    return c.json({
      daily: dailyRows.map((r, i) => ({
        rank: i + 1,
        username: r.username,
        guesses: r.guesses,
        hints: r.hints,
        durationMs: r.solvedAt && r.startedAt ? r.solvedAt.getTime() - r.startedAt.getTime() : null,
      })),
      streaks: streakRows.map((r, i) => ({ rank: i + 1, username: r.username, current: r.current, longest: r.longest })),
    })
  })

  app.get('/archive', async (c) => {
    const mode = c.req.query('mode') as WynndleMode | undefined
    if (!mode || !(wynndleMode as readonly string[]).includes(mode))
      return c.json({ error: 'bad mode' }, 400)
    const m = mode as WynndleMode
    const limitRaw = Number.parseInt(c.req.query('limit') ?? '30', 10)
    const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 30, 100)
    const today = todayUtc()
    const rows = await db.select({ date: wynndlePuzzles.date, itemName: wynndlePuzzles.itemName, itemRarity: wynndlePuzzles.itemRarity })
      .from(wynndlePuzzles)
      .where(and(eq(wynndlePuzzles.mode, m), sql`${wynndlePuzzles.date} < ${today}`))
      .orderBy(desc(wynndlePuzzles.date))
      .limit(limit)
    return c.json(rows)
  })

  app.get('/archive/:date', async (c) => {
    const mode = c.req.query('mode') as WynndleMode | undefined
    if (!mode || !(wynndleMode as readonly string[]).includes(mode))
      return c.json({ error: 'bad mode' }, 400)
    const m = mode as WynndleMode
    const date = c.req.param('date')
    if (date >= todayUtc())
      return c.json({ error: 'not yet' }, 403)
    const [puzzle] = await db.select().from(wynndlePuzzles).where(and(eq(wynndlePuzzles.mode, m), eq(wynndlePuzzles.date, date))).limit(1)
    if (!puzzle)
      return c.json({ error: 'not found' }, 404)
    const items = await poolService.getPool(m, puzzle.gameVersion)
    const answer = items.find(i => i.id === puzzle.itemId) ?? null
    return c.json({ date: puzzle.date, answer, gameVersion: puzzle.gameVersion })
  })

  app.post('/hint', async (c) => {
    let body: { mode?: unknown }
    try {
      body = await c.req.json()
    }
    catch {
      return c.json({ error: 'bad json' }, 400)
    }
    const mode = body.mode
    if (typeof mode !== 'string' || !(wynndleMode as readonly string[]).includes(mode))
      return c.json({ error: 'bad mode' }, 400)
    const m = mode as WynndleMode
    const puzzle = await puzzleService.getOrCreateToday(m, todayUtc())
    const round = await findRound(c, puzzle.id)
    if (!round)
      return c.json({ error: 'no round' }, 404)
    if (round.finished === 1)
      return c.json({ error: 'finished' }, 409)
    const next = round.hintsRevealed + 1
    if (next > 4)
      return c.json({ error: 'no more hints' }, 409)
    if (round.guessCount < HINT_GATES[next])
      return c.json({ error: 'hint locked' }, 409)
    await db.update(wynndleRounds).set({ hintsRevealed: next }).where(eq(wynndleRounds.id, round.id))
    const [fresh] = await db.select().from(wynndleRounds).where(eq(wynndleRounds.id, round.id)).limit(1)
    if (!fresh)
      return c.json({ error: 'round vanished' }, 500)
    return c.json({ round: await materializeRound(fresh, puzzle) })
  })

  return app
}

function defaultWiring(): Deps {
  const cdnBase = env().CDN_BASE_URL
  const pool = createPoolService({ cdnBase })
  const versions = createVersionsResolver({ cdnBase })
  const db = getDb()
  const puzzleService = createPuzzleService({
    db,
    poolService: pool,
    resolveCurrentVersion: () => versions.current(),
  })
  return { db, poolService: pool, puzzleService }
}

export const wynndle = createWynndleRoute(defaultWiring())
