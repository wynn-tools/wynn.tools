import { useApi } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async () => {
  const store = useAuthStore()
  const api = useApi()
  try {
    const user = await api.me()
    store.setUser(user)
  }
  catch {
    store.clearUser()
  }
})
