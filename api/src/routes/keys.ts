import type { MiddlewareHandler } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { AppError } from '../lib/errors'
import { requireAuth } from '../middleware/auth'
import { ALL_SCOPES, createApiKey, listApiKeys, revokeApiKey } from '../services/api-keys'

const sessionOnly: MiddlewareHandler = async (c, next) => {
  if (!c.get('auth').capabilities.includes('*'))
    throw new AppError(403, 'forbidden', 'Key management requires a session')
  await next()
}

const createBody = z.object({
  label: z.string().min(1).max(64),
  scopes: z.array(z.enum(ALL_SCOPES)).min(1),
})

export const keys = new Hono()
  .use('*', requireAuth, sessionOnly)
  .get('/', async (c) => {
    return c.json(await listApiKeys(c.get('auth').user.id))
  })
  .post(
    '/',
    zValidator('json', createBody, (r, c) => {
      if (!r.success)
        return c.json({ error: { code: 'validation_error', message: r.error.message } }, 400)
    }),
    async (c) => {
      const { label, scopes } = c.req.valid('json')
      const { plaintext, record } = await createApiKey(c.get('auth').user.id, label, scopes)
      return c.json({ id: record.id, plaintext, prefix: record.prefix, scopes: record.scopes }, 201)
    },
  )
  .delete('/:id', async (c) => {
    await revokeApiKey(c.get('auth').user.id, c.req.param('id'))
    return c.json({ ok: true })
  })
