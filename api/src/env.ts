import process from 'node:process'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  FRONTEND_URL: z.string().url(),
  COOKIE_DOMAIN: z.string().min(1),
  CDN_BASE_URL: z.string().url(),
  WYNNVENTORY_API_KEY: z.string().min(1),
  WYNNVENTORY_BASE_URL: z.string().url().default('https://wynnventory.com'),
  PORT: z.coerce.number().int().positive().default(8080),
})

export type Env = z.infer<typeof schema>

export function parseEnv(raw: NodeJS.ProcessEnv | Record<string, unknown>): Env {
  const result = schema.safeParse(raw)
  if (!result.success)
    throw new Error(`Invalid environment: ${result.error.message}`)
  return result.data
}

let cached: Env | null = null
export function env(): Env {
  cached ??= parseEnv(process.env)
  return cached
}
