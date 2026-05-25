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
  modules: ['@nuxt/eslint', 'reka-ui/nuxt', '@pinia/nuxt'],
  eslint: {
    config: {
      standalone: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap' },
      ],
    },
  },
})
