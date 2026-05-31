import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { env } from '../env'
import { ipRateLimit } from '../middleware/market-rate-limit'
import { getCachedPrice, getCachedPrices } from '../services/market-cache'
import { createWynnventoryClient } from '../services/wynnventory'

function upstream() {
  const { WYNNVENTORY_API_KEY, WYNNVENTORY_BASE_URL } = env()
  return createWynnventoryClient({ apiKey: WYNNVENTORY_API_KEY, baseUrl: WYNNVENTORY_BASE_URL })
}

const priceQuery = z.object({
  tier: z.coerce.number().int().optional(),
  shiny: z.coerce.boolean().optional(),
})

// Per-item schema is {name, tier?} only — shiny is intentionally omitted because
// build-cost pricing is always non-shiny (the single /price/:name route still supports ?shiny=).
const batchBody = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    tier: z.number().int().optional(),
  })).min(1).max(64),
})

export const market = new Hono()
  .use('*', ipRateLimit({ limit: 30, windowMs: 60_000 }))
  .get('/price/:name', zValidator('query', priceQuery), async (c) => {
    const name = c.req.param('name')
    const { tier, shiny } = c.req.valid('query')
    const payload = await getCachedPrice({ name, tier, shiny }, upstream())
    return c.json(payload ?? null)
  })
  .post(
    '/prices',
    zValidator('json', batchBody, (r, c) => {
      if (!r.success)
        return c.json({ error: { code: 'validation_error', message: r.error.message } }, 400)
    }),
    async (c) => {
      const { items } = c.req.valid('json')
      const results = await getCachedPrices(items, upstream())
      return c.json({ results })
    },
  )
