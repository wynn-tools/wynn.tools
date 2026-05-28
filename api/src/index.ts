import { serve } from '@hono/node-server'
import { createApp } from './app'
import { env } from './env'

const app = createApp()
const { PORT } = env()
serve({ fetch: app.fetch, port: PORT })
// eslint-disable-next-line no-console
console.log(`api listening on :${PORT}`)
