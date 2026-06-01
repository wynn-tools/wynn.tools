import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('../app', import.meta.url)),
      '@core': fileURLToPath(new URL('../app/lib', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    globalSetup: ['./test/setup.ts'],
    env: {
      DATABASE_URL: 'postgres://wynn:wynn@localhost:5433/wynn_test',
      DISCORD_CLIENT_ID: 'id',
      DISCORD_CLIENT_SECRET: 'secret',
      DISCORD_REDIRECT_URI: 'https://api.wynn.tools/v1/auth/discord/callback',
      DISCORD_TOKEN: 'test-bot-token',
      DISCORD_GUILD_ID: '111',
      DISCORD_INVITE_URL: 'https://discord.gg/test',
      DISCORD_PUBLIC_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
      DISCORD_APPLICATION_ID: '123456789012345678',
      FRONTEND_URL: 'https://wynn.tools',
      COOKIE_DOMAIN: '.wynn.tools',
      CDN_BASE_URL: 'https://cdn.wynn.tools/',
      WYNNVENTORY_API_KEY: 'test-key',
    },
  },
})
