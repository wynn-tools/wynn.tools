import { Hono } from 'hono'
import { AppError } from '../lib/errors'

export const health = new Hono()
  .get('/', c => c.json({ status: 'ok' }))
  // exercises the error envelope in tests
  .get('/boom', () => {
    throw new AppError(418, 'teapot', 'boom')
  })
