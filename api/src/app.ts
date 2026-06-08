import type { OgFetcher } from './services/og-fetcher'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env'
import { onError } from './lib/errors'
import { rateLimit } from './middleware/rate-limit'
import { auth, me } from './routes/auth'
import { builds, userBuilds } from './routes/builds'
import { discord } from './routes/discord'
import { health } from './routes/health'
import { items, userItems } from './routes/items'
import { keys } from './routes/keys'
import { market } from './routes/market'
import { createOgRoute } from './routes/og'
import { meProfile, userProfile } from './routes/profile'
import { wynndle } from './routes/wynndle'
import { createOgFetcher } from './services/og-fetcher'

export function createApp(ogFetcher?: OgFetcher): Hono {
  const app = new Hono()
  app.onError(onError)
  const isDiscord = (path: string): boolean => path.startsWith('/v1/discord/')
  app.use('/v1/*', async (c, next) => {
    if (isDiscord(c.req.path))
      return next()
    return cors({
      origin: env().FRONTEND_URL,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    })(c, next)
  })
  app.use('/v1/*', async (c, next) => {
    if (isDiscord(c.req.path))
      return next()
    return rateLimit({ limit: 60, windowMs: 60_000 })(c, next)
  })
  app.route('/v1/discord', discord)
  app.route('/v1/health', health)
  app.route('/v1/auth', auth)
  app.route('/v1/me', me)
  app.route('/v1/me/keys', keys)
  app.route('/v1/me/profile', meProfile)
  app.route('/v1/builds', builds)
  app.route('/v1/users', userBuilds)
  app.route('/v1/users', userItems)
  app.route('/v1/users', userProfile)
  app.route('/v1/items', items)
  app.route('/v1/market', market)
  app.route('/v1/wynndle', wynndle)
  const fetcher = ogFetcher ?? createOgFetcher(env().FRONTEND_URL)
  app.route('/v1/og', createOgRoute(fetcher))
  return app
}
