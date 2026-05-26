import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    vue: true,
    typescript: true,
    formatters: true,
    ignores: ['docs/**'],
  }),
  {
    rules: {
      // Vue 3 layouts may use a bare <slot /> as the single template root
      'vue/no-multiple-template-root': 'off',
    },
  },
)
