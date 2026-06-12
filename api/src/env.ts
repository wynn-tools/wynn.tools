import process from 'node:process'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.string().regex(/^\d+$/, 'Discord snowflake ID'),
  DISCORD_INVITE_URL: z.string().url(),
  DISCORD_PUBLIC_KEY: z.string().regex(/^[0-9a-f]{64}$/, 'Discord public key (hex, 32 bytes)'),
  DISCORD_APPLICATION_ID: z.string().regex(/^\d+$/, 'Discord snowflake ID'),
  FRONTEND_URL: z.string().url(),
  API_PUBLIC_URL: z.string().url(),
  COOKIE_DOMAIN: z.string().min(1),
  CDN_BASE_URL: z.string().url(),
  WYNNVENTORY_API_KEY: z.string().min(1),
  WYNNVENTORY_BASE_URL: z.string().url().default('https://wynnventory.com'),
  NORI_BASE_URL: z.string().url().default('https://nori.fish'),
  WYNNPOOL_BASE_URL: z.string().url().default('https://api.wynnpool.com'),
  UPLOAD_DIR: z.string().min(1).default('/var/lib/wynn-api/uploads'),
  DISCORD_FUNCTION_STOCK_CHANNEL_ID: z.string().regex(/^\d+$/).optional(),
  DISCORD_STOCK_MOD_WEBHOOK_URL: z.string().url().optional(),
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

export function resetEnvCache(): void {
  cached = null
}
