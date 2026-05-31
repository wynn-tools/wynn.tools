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
      FRONTEND_URL: 'https://wynn.tools',
      COOKIE_DOMAIN: '.wynn.tools',
      CDN_BASE_URL: 'https://cdn.wynn.tools/',
      NUXT_URL: 'http://localhost:3000',
      WYNNVENTORY_API_KEY: 'test-key',
    },
  },
})
