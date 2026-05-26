import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/global.css'],
  runtimeConfig: {
    public: {
      // Override at runtime with NUXT_PUBLIC_CDN_BASE_URL
      cdnBaseUrl: 'https://cdn.wynn.tools/data',
    },
  },
  modules: ['@nuxt/eslint', 'reka-ui/nuxt', '@pinia/nuxt', '@nuxt/fonts', 'nuxt-og-image'],
  ogImage: {
    compatibility: {
      dev: { satori: 'node', resvg: 'node' },
      runtime: { satori: 'wasm', resvg: 'wasm' },
    },
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: {
    families: [
      { name: 'Geist', weights: [300, 400, 500, 700], global: true },
      { name: 'Geist Mono', weights: [400, 500], global: true },
    ],
  },
})
