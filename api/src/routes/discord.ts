import { Hono } from 'hono'
import { env } from '../env'
import { dispatch } from '../services/discord-interactions/dispatch'
import { verifyEd25519 } from '../services/discord-verify'

export const discord = new Hono()
  .post('/interactions', async (c) => {
    const signature = c.req.header('x-signature-ed25519') ?? ''
    const timestamp = c.req.header('x-signature-timestamp') ?? ''
    const rawBody = await c.req.text()
    if (!verifyEd25519(rawBody, signature, timestamp, env().DISCORD_PUBLIC_KEY))
      return c.text('invalid signature', 401)
    const interaction = JSON.parse(rawBody)
    const response = await dispatch(interaction)
    return c.json(response)
  })
