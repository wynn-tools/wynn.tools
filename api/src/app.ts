import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env'
import { onError } from './lib/errors'
import { rateLimit } from './middleware/rate-limit'
import { auth, me } from './routes/auth'
import { builds, userBuilds } from './routes/builds'
import { health } from './routes/health'
import { items, userItems } from './routes/items'
import { keys } from './routes/keys'
import { market } from './routes/market'
import { meProfile, userProfile } from './routes/profile'

export function createApp(): Hono {
  const app = new Hono()
  app.onError(onError)
  app.use('/v1/*', cors({
    origin: env().FRONTEND_URL,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }))
  app.use('/v1/*', rateLimit({ limit: 60, windowMs: 60_000 }))
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
  return app
}
