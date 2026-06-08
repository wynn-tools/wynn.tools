import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb } from '../src/db/client'
import { users, wynndlePuzzles, wynndleRounds, wynndleStreaks } from '../src/db/schema'
import { newResourceId } from '../src/lib/ids'
import { createWynndleRoute } from '../src/routes/wynndle'
import { createSession } from '../src/services/sessions'
import { createPuzzleService } from '../src/services/wynndle-puzzle'

const db = getDb()

const pool = [
  { id: 'AlphaSword', name: 'AlphaSword', mode: 'weapon' as const, rarity: 'Mythic' as const, level: 1, powders: 0, elements: [] },
  { id: 'BetaSword', name: 'BetaSword', mode: 'weapon' as const, rarity: 'Mythic' as const, level: 1, powders: 0, elements: [] },
  { id: 'GammaHelm', name: 'GammaHelm', mode: 'armor' as const, rarity: 'Mythic' as const, level: 1, powders: 0, elements: [] },
]

function poolService() {
  return {
    getPool: async (mode: 'weapon' | 'armor') => pool.filter(p => p.mode === mode),
  }
}

function buildApp(opts?: { streakRecorder?: (userId: string, mode: 'weapon' | 'armor', date: string, won: boolean) => Promise<void> }) {
  const ps = poolService()
  const puzzleService = createPuzzleService({
    db,
    poolService: ps,
    resolveCurrentVersion: async () => '2.2.0.31',
  })
  const wynndle = createWynndleRoute({ db, poolService: ps, puzzleService, streakRecorder: opts?.streakRecorder })
  const app = new Hono()
  app.route('/v1/wynndle', wynndle)
  return (path: string, init?: RequestInit) => app.request(`http://test${path}`, init)
}

async function getPuzzleAnswer(mode: 'weapon' | 'armor') {
  const [row] = await db.select().from(wynndlePuzzles).where(eq(wynndlePuzzles.mode, mode)).limit(1)
  return row
}

function postGuess(itemId: string, headers: Record<string, string> = {}, mode: 'weapon' | 'armor' = 'weapon') {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ mode, itemId }),
  } satisfies RequestInit
}

describe('gET /v1/wynndle/today', () => {
  beforeEach(async () => {
    await db.delete(wynndlePuzzles)
  })

  it('returns puzzle metadata without leaking the answer', async () => {
    const req = buildApp()
    const res = await req('/v1/wynndle/today?mode=weapon')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.puzzle.mode).toBe('weapon')
    expect(body.puzzle.gameVersion).toBe('2.2.0.31')
    expect(typeof body.puzzle.id).toBe('string')
    expect(typeof body.puzzle.date).toBe('string')
    expect(body.puzzle.itemId).toBeUndefined()
    expect(body.puzzle.itemName).toBeUndefined()
  })

  it('returns round: null when no round exists', async () => {
    const req = buildApp()
    const res = await req('/v1/wynndle/today?mode=weapon')
    const body = await res.json()
    expect(body.round).toBeNull()
  })

  it('is idempotent: two calls return the same puzzle id', async () => {
    const req = buildApp()
    const a = await (await req('/v1/wynndle/today?mode=weapon')).json()
    const b = await (await req('/v1/wynndle/today?mode=weapon')).json()
    expect(a.puzzle.id).toBe(b.puzzle.id)
  })

  it('rejects unknown mode', async () => {
    const req = buildApp()
    const res = await req('/v1/wynndle/today?mode=bogus')
    expect(res.status).toBe(400)
  })
})

describe('pOST /v1/wynndle/guess', () => {
  beforeEach(async () => {
    await db.delete(wynndlePuzzles)
    await db.delete(users)
  })

  it('rejects a guess for an item not in the pool', async () => {
    const req = buildApp()
    const res = await req('/v1/wynndle/guess', postGuess('NotARealItem', { 'x-anon-key': 'anon1' }))
    expect(res.status).toBe(400)
  })

  it('requires auth or an anon key', async () => {
    const req = buildApp()
    const res = await req('/v1/wynndle/guess', postGuess('AlphaSword'))
    expect(res.status).toBe(400)
  })

  it('marks the round as won when the anon guesses correctly', async () => {
    const req = buildApp()
    await req('/v1/wynndle/today?mode=weapon')
    const puzzle = await getPuzzleAnswer('weapon')
    const res = await req('/v1/wynndle/guess', postGuess(puzzle!.itemId, { 'x-anon-key': 'anon-correct' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.round.won).toBe(true)
    expect(body.round.finished).toBe(true)
    expect(body.round.guesses.length).toBe(1)
  })

  it('accumulates guesses across calls for the same anon round', async () => {
    const req = buildApp()
    await req('/v1/wynndle/today?mode=weapon')
    const puzzle = await getPuzzleAnswer('weapon')
    const wrong = pool.find(p => p.mode === 'weapon' && p.id !== puzzle!.itemId)!
    const first = await req('/v1/wynndle/guess', postGuess(wrong.id, { 'x-anon-key': 'anon-multi' }))
    const firstBody = await first.json()
    expect(firstBody.round.guesses.length).toBe(1)
    expect(firstBody.round.finished).toBe(false)
    const second = await req('/v1/wynndle/guess', postGuess(puzzle!.itemId, { 'x-anon-key': 'anon-multi' }))
    const secondBody = await second.json()
    expect(secondBody.round.guesses.length).toBe(2)
    expect(secondBody.round.finished).toBe(true)
    expect(secondBody.round.won).toBe(true)
  })

  it('finishes the round as a loss after MAX_GUESSES wrong guesses', async () => {
    const localPool = Array.from({ length: 11 }, (_, i) => ({
      id: `W${i}`,
      name: `W${i}`,
      mode: 'weapon' as const,
      rarity: 'Mythic' as const,
      level: 1,
      powders: 0,
      elements: [],
    }))
    const ps = { getPool: async (_mode: 'weapon' | 'armor') => localPool }
    const puzzleService = createPuzzleService({
      db,
      poolService: ps,
      resolveCurrentVersion: async () => '2.2.0.31',
    })
    const wynndle = createWynndleRoute({ db, poolService: ps, puzzleService })
    const app = new Hono()
    app.route('/v1/wynndle', wynndle)
    const req = (path: string, init?: RequestInit) => app.request(`http://test${path}`, init)
    await req('/v1/wynndle/today?mode=weapon')
    const puzzle = await getPuzzleAnswer('weapon')
    const wrongItems = localPool.filter(p => p.id !== puzzle!.itemId).slice(0, 10)
    let last: Response | undefined
    for (const w of wrongItems) {
      last = await req('/v1/wynndle/guess', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-anon-key': 'anon-loss' },
        body: JSON.stringify({ mode: 'weapon', itemId: w.id }),
      })
    }
    expect(last!.status).toBe(200)
    const body = await last!.json()
    expect(body.round.guesses.length).toBe(10)
    expect(body.round.finished).toBe(true)
    expect(body.round.won).toBe(false)
  })

  it('invokes the streak recorder when an authed user finishes', async () => {
    const [u] = await db.insert(users).values({ id: newResourceId(), discordId: `s-${Date.now()}`, username: `u-${Date.now()}` }).returning()
    const token = await createSession(u.id)
    const streakRecorder = vi.fn(async () => {})
    const req = buildApp({ streakRecorder })
    await req('/v1/wynndle/today?mode=weapon')
    const puzzle = await getPuzzleAnswer('weapon')
    const res = await req('/v1/wynndle/guess', postGuess(puzzle!.itemId, { cookie: `session=${token}` }))
    expect(res.status).toBe(200)
    expect(streakRecorder).toHaveBeenCalledWith(u.id, 'weapon', puzzle!.date, true)
  })
})

describe('pOST /v1/wynndle/hint', () => {
  beforeEach(async () => {
    await db.delete(wynndlePuzzles)
    await db.delete(users)
  })

  function buildBigApp() {
    const localPool = Array.from({ length: 11 }, (_, i) => ({
      id: `H${i}`,
      name: `H${i}`,
      mode: 'weapon' as const,
      rarity: 'Mythic' as const,
      level: 1,
      powders: 0,
      elements: [],
    }))
    const ps = { getPool: async (_mode: 'weapon' | 'armor') => localPool }
    const puzzleService = createPuzzleService({
      db,
      poolService: ps,
      resolveCurrentVersion: async () => '2.2.0.31',
    })
    const wynndle = createWynndleRoute({ db, poolService: ps, puzzleService })
    const app = new Hono()
    app.route('/v1/wynndle', wynndle)
    const req = (path: string, init?: RequestInit) => app.request(`http://test${path}`, init)
    return { req, localPool }
  }

  function postHint(headers: Record<string, string> = {}, mode: 'weapon' | 'armor' = 'weapon') {
    return {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ mode }),
    } satisfies RequestInit
  }

  it('returns 404 when no round exists', async () => {
    const req = buildApp()
    await req('/v1/wynndle/today?mode=weapon')
    const res = await req('/v1/wynndle/hint', postHint({ 'x-anon-key': 'no-round' }))
    expect(res.status).toBe(404)
  })

  it('is locked at guessCount 0 and 1, then unlocks every 2 guesses', async () => {
    const { req, localPool } = buildBigApp()
    await req('/v1/wynndle/today?mode=weapon')
    const puzzle = await getPuzzleAnswer('weapon')
    const wrongItems = localPool.filter(p => p.id !== puzzle!.itemId)
    const anon = { 'x-anon-key': 'hint-anon' }

    async function guess(itemId: string) {
      return req('/v1/wynndle/guess', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...anon },
        body: JSON.stringify({ mode: 'weapon', itemId }),
      })
    }

    await guess(wrongItems[0].id)
    let res = await req('/v1/wynndle/hint', postHint(anon))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('hint locked')

    await guess(wrongItems[1].id)
    res = await req('/v1/wynndle/hint', postHint(anon))
    expect(res.status).toBe(200)
    let body = await res.json()
    expect(body.round.hints.length).toBe(1)
    expect(body.round.hintsRevealed).toBe(1)

    res = await req('/v1/wynndle/hint', postHint(anon))
    expect(res.status).toBe(409)

    await guess(wrongItems[2].id)
    await guess(wrongItems[3].id)
    res = await req('/v1/wynndle/hint', postHint(anon))
    expect(res.status).toBe(200)
    body = await res.json()
    expect(body.round.hints.length).toBe(2)
    expect(body.round.hintsRevealed).toBe(2)
  })
})

describe('gET /v1/wynndle/leaderboard', () => {
  beforeEach(async () => {
    await db.delete(wynndlePuzzles)
    await db.delete(wynndleStreaks)
    await db.delete(users)
  })

  it('returns empty arrays when no won rounds exist', async () => {
    const req = buildApp()
    await req('/v1/wynndle/today?mode=weapon')
    const res = await req('/v1/wynndle/leaderboard?mode=weapon')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daily).toEqual([])
    expect(body.streaks).toEqual([])
  })

  it('orders daily entries by (guesses+hints) ascending', async () => {
    const req = buildApp()
    await req('/v1/wynndle/today?mode=weapon')
    const puzzle = await getPuzzleAnswer('weapon')
    const [u1] = await db.insert(users).values({ id: newResourceId(), discordId: `lb1-${Date.now()}`, username: `lb1-${Date.now()}` }).returning()
    const [u2] = await db.insert(users).values({ id: newResourceId(), discordId: `lb2-${Date.now()}`, username: `lb2-${Date.now()}` }).returning()
    const now = new Date()
    await db.insert(wynndleRounds).values({
      id: newResourceId(),
      puzzleId: puzzle!.id,
      userId: u1.id,
      guessCount: 5,
      hintsRevealed: 2,
      won: 1,
      finished: 1,
      startedAt: new Date(now.getTime() - 60000),
      solvedAt: now,
    })
    await db.insert(wynndleRounds).values({
      id: newResourceId(),
      puzzleId: puzzle!.id,
      userId: u2.id,
      guessCount: 2,
      hintsRevealed: 1,
      won: 1,
      finished: 1,
      startedAt: new Date(now.getTime() - 30000),
      solvedAt: now,
    })
    const res = await req('/v1/wynndle/leaderboard?mode=weapon')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.daily.length).toBe(2)
    expect(body.daily[0].username).toBe(u2.username)
    expect(body.daily[0].rank).toBe(1)
    expect(body.daily[1].username).toBe(u1.username)
    expect(body.daily[1].rank).toBe(2)
  })
})

describe('gET /v1/wynndle/archive', () => {
  beforeEach(async () => {
    await db.delete(wynndlePuzzles)
  })

  it('excludes today from the list', async () => {
    const req = buildApp()
    await req('/v1/wynndle/today?mode=weapon')
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    await db.insert(wynndlePuzzles).values({
      id: newResourceId(),
      mode: 'weapon',
      date: yesterday,
      itemId: 'AlphaSword',
      itemName: 'AlphaSword',
      gameVersion: '2.2.0.31',
    })
    const res = await req('/v1/wynndle/archive?mode=weapon')
    expect(res.status).toBe(200)
    const body = await res.json()
    const dates = body.map((r: { date: string }) => r.date)
    expect(dates).toContain(yesterday)
    expect(dates).not.toContain(today)
  })

  it('returns 403 for today on detail', async () => {
    const req = buildApp()
    const today = new Date().toISOString().slice(0, 10)
    const res = await req(`/v1/wynndle/archive/${today}?mode=weapon`)
    expect(res.status).toBe(403)
  })

  it('returns 200 with resolved answer for an old puzzle', async () => {
    const req = buildApp()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    await db.insert(wynndlePuzzles).values({
      id: newResourceId(),
      mode: 'weapon',
      date: yesterday,
      itemId: 'AlphaSword',
      itemName: 'AlphaSword',
      gameVersion: '2.2.0.31',
    })
    const res = await req(`/v1/wynndle/archive/${yesterday}?mode=weapon`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.date).toBe(yesterday)
    expect(body.answer.id).toBe('AlphaSword')
    expect(body.gameVersion).toBe('2.2.0.31')
  })
})
