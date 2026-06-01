import process from 'node:process'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { env } from './env'
import { initItemIndex } from './services/discord-interactions/item-index'
import { startDiscordPresence } from './services/discord-presence'

const app = createApp()
const { PORT, DISCORD_TOKEN } = env()

if (process.env.NODE_ENV !== 'test') {
  initItemIndex().catch((err) => {
    console.warn('item index init failed:', err?.message ?? err)
  })
  startDiscordPresence({ token: DISCORD_TOKEN, activityName: 'wynn.tools', activityType: 3 })
}

serve({ fetch: app.fetch, port: PORT })
// eslint-disable-next-line no-console
console.log(`api listening on :${PORT}`)
