import { onMounted } from 'vue'
import { useDiscordJoin } from '~/composables/useDiscordJoin'
import { useToast } from '~/composables/useToast'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { pushAction } = useToast()
  const { inviteUrl } = useDiscordJoin()

  function maybeFire() {
    const route = router.currentRoute.value
    if (route.query.discord_join !== 'error')
      return
    pushAction('error', 'Couldn\'t add you to Discord automatically.', {
      label: 'Join via invite →',
      run: () => window.open(inviteUrl, '_blank', 'noopener'),
    })
    const { discord_join: _omit, ...rest } = route.query
    router.replace({ path: route.path, query: rest, hash: route.hash })
  }

  onMounted(() => maybeFire())
  router.afterEach(() => maybeFire())
})
