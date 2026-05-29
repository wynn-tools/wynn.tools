import type { ApiUser } from '~/composables/useApi'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '~/composables/useApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<ApiUser | null>(null)
  const pending = ref(true)

  function setUser(u: ApiUser) {
    user.value = u
    pending.value = false
  }

  function clearUser() {
    user.value = null
    pending.value = false
  }

  function login() {
    if (!import.meta.client)
      return
    const config = useRuntimeConfig()
    const returnTo = encodeURIComponent(
      window.location.pathname + window.location.search + window.location.hash,
    )
    window.location.href = `${config.public.apiBaseUrl}/v1/auth/discord/login?return_to=${returnTo}`
  }

  async function logout() {
    const api = useApi()
    try {
      await api.logout()
    }
    catch { /* ignore */ }
    clearUser()
    await navigateTo('/')
  }

  return { user, pending, setUser, clearUser, login, logout }
})
