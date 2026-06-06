import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/scripts/warm-item-og.ts',
    'src/scripts/register-discord-commands.ts',
    'src/scripts/admin/claim.ts',
    'src/scripts/imports/main.ts',
  ],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  bundle: true,
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      '~': fileURLToPath(new URL('../app', import.meta.url)),
      '@core': fileURLToPath(new URL('../app/lib', import.meta.url)),
    }
  },
})
