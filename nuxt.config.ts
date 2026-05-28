import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['./app/assets/css/global.css'],
  runtimeConfig: {
    public: {
      // Override at runtime with NUXT_PUBLIC_CDN_BASE_URL.
      // Root base: versions.json lives at the root; snapshots under data/{hash}/.
      cdnBaseUrl: 'https://cdn.wynn.tools/',
      athenaUrl: 'https://athena.wynntils.com',
    },
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },
  modules: ['@nuxt/eslint', 'reka-ui/nuxt', '@pinia/nuxt', '@nuxt/fonts', 'nuxt-og-image', '@nuxt/icon'],
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
      { name: 'Barlow Semi Condensed', weights: [400, 500, 600, 700, 800], global: true },
      { name: 'Figtree', weights: [300, 400, 500, 600, 700], global: true },
      { name: 'Geist Mono', weights: [400, 500], global: true },
    ],
  },
})
