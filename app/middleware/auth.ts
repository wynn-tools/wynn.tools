import { watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const store = useAuthStore()
  if (store.pending) {
    await new Promise<void>((resolve) => {
      const stop = watch(() => store.pending, (p) => {
        if (!p) {
          stop()
          resolve()
        }
      })
    })
  }
  if (!store.user)
    return navigateTo(`/?return_to=${encodeURIComponent(to.fullPath)}`)
})
