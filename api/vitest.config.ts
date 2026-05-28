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
  },
})
