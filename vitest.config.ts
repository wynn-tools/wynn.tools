import { resolve } from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
    },
  },
  test: {
    environment: 'node',
    // The `api` workspace package has its own vitest config (needs a Postgres
    // test DB + migration globalSetup); exclude it from the root frontend run.
    exclude: [...configDefaults.exclude, 'api/**'],
  },
})
