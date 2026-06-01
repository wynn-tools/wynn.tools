<script setup lang="ts">
import { computed } from 'vue'
import { useDiscordJoin } from '~/composables/useDiscordJoin'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { join, inviteUrl } = useDiscordJoin()

useSeoMeta({
  title: 'Welcome — wynn.tools',
  ogTitle: 'Welcome — wynn.tools',
  robots: 'noindex',
})

const returnTo = computed(() => {
  const raw = route.query.return_to
  if (typeof raw !== 'string' || !raw.startsWith('/'))
    return '/'
  return raw
})

async function decline() {
  await auth.declineDiscordPrompt()
  router.replace(returnTo.value)
}
</script>

<template>
  <main class="welcome">
    <section class="welcome-card" aria-labelledby="welcome-heading">
      <p class="kicker">
        Community
      </p>
      <h1 id="welcome-heading" class="welcome-title">
        Join the wynn.tools Discord
      </h1>
      <p class="welcome-sub">
        Get help, share builds, and hear about new tools as we ship them.
      </p>
      <div class="welcome-actions">
        <button type="button" class="btn-primary" @click="join">
          Join the server
        </button>
        <button type="button" class="btn-ghost" @click="decline">
          No thanks
        </button>
      </div>
      <p class="welcome-foot">
        Prefer a plain invite link?
        <a :href="inviteUrl" target="_blank" rel="noopener">Open in Discord →</a>
      </p>
    </section>
  </main>
</template>

<style scoped>
.welcome {
  display: flex;
  justify-content: center;
  padding: 4rem 1.5rem;
}
.welcome-card {
  max-width: 32rem;
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 2rem;
}
.welcome-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0.5rem 0 0.75rem;
}
.welcome-sub {
  color: var(--color-muted);
  margin: 0 0 1.5rem;
}
.welcome-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg);
  border: 0;
  padding: 0.6rem 1rem;
  border-radius: 0.4rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-ghost {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.6rem 1rem;
  border-radius: 0.4rem;
  cursor: pointer;
}
.welcome-foot {
  margin-top: 1.5rem;
  color: var(--color-faint);
  font-size: 0.875rem;
}
.welcome-foot a {
  color: var(--color-accent);
}
</style>
