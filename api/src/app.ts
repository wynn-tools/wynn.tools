import { Hono } from 'hono'

export function createApp(): Hono {
  const app = new Hono()
  // Routes mounted in later tasks under /v1
  return app
}
