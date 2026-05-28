import { Hono } from 'hono'
import { onError } from './lib/errors'
import { health } from './routes/health'

export function createApp(): Hono {
  const app = new Hono()
  app.onError(onError)
  app.route('/v1/health', health)
  return app
}
