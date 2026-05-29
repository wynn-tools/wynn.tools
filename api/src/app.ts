import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env'
import { onError } from './lib/errors'
import { auth, me } from './routes/auth'
import { builds, userBuilds } from './routes/builds'
import { health } from './routes/health'
import { items, userItems } from './routes/items'
import { keys } from './routes/keys'

export function createApp(): Hono {
  const app = new Hono()
  app.onError(onError)
  app.use('/v1/*', cors({
    origin: env().FRONTEND_URL,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }))
  app.route('/v1/health', health)
  app.route('/v1/auth', auth)
  app.route('/v1/me', me)
  app.route('/v1/me/keys', keys)
  app.route('/v1/builds', builds)
  app.route('/v1/users', userBuilds)
  app.route('/v1/items', items)
  app.route('/v1/users', userItems)
  return app
}
