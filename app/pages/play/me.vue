<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'play',
  pageTransition: { name: 'play-fade', mode: 'out-in' },
})

useSeoMeta({ title: 'Me · Play · wynn.tools' })

const auth = useAuthStore()
const isSignedIn = computed(() => auth.user != null)
const userName = computed(() => auth.user?.username ?? null)

// Per-game settings persistence is deferred — the UI shape is what this pass
// ships. Each game in /play owns its own per-game options that surface here
// when the player has an account; for now the page just covers identity and
// the cross-game leaderboard visibility toggle.
const hideFromBoards = ref(false)

function signIn() {
  auth.login()
}

function signOut() {
  void auth.logout()
}
</script>

<template>
  <section class="me-page">
    <header class="me-header">
      <span class="me-kicker">PROFILE</span>
      <h1 class="me-title">
        Your Play account.
      </h1>
    </header>

    <!-- Identity card -->
    <div class="me-frame">
      <h2 class="frame-kicker">
        IDENTITY
      </h2>
      <template v-if="isSignedIn">
        <div class="identity-row">
          <span class="identity-label">Discord</span>
          <span class="identity-value">{{ userName }}</span>
        </div>
        <button type="button" class="me-pill danger" @click="signOut">
          Sign out
        </button>
      </template>
      <template v-else>
        <p class="identity-blurb">
          Sign in with Discord to sync your progress across devices and to appear on game leaderboards.
        </p>
        <button type="button" class="me-pill gold" @click="signIn">
          SIGN IN WITH DISCORD
        </button>
      </template>
    </div>

    <!-- Visibility card -->
    <div class="me-frame">
      <h2 class="frame-kicker">
        VISIBILITY
      </h2>

      <div class="setting">
        <label class="setting-toggle">
          <input
            v-model="hideFromBoards"
            type="checkbox"
            :disabled="!isSignedIn"
          >
          <span>Hide me from leaderboards</span>
        </label>
        <p class="setting-help">
          Applies across every game in /play. Your solves still count for your own history and streaks; they just won't appear on public boards.
        </p>
      </div>
    </div>

    <!-- Persistence notice -->
    <div class="me-frame">
      <h2 class="frame-kicker">
        PROGRESS
      </h2>
      <p class="setting-help">
        <template v-if="isSignedIn">
          Signed-in progress syncs across devices.
        </template>
        <template v-else>
          Anonymous progress is stored on this device. Sign in to sync.
        </template>
        Each game decides its own day boundaries; the daily ones use UTC midnight.
      </p>
    </div>
  </section>
</template>

<style scoped>
.me-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 0 64px;
  display: grid;
  gap: 18px;
}

.me-header {
  text-align: center;
  display: grid;
  gap: 6px;
  padding: 18px 0;
}

.me-kicker {
  display: inline-block;
  justify-self: center;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--paper-base);
  background: rgb(65 38 36 / 0.5);
  padding: 4px 14px;
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.me-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4.5vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--paper-base);
  margin: 6px 0;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.3);
}

.me-frame {
  background: var(--paper-base);
  padding: 22px 24px;
  box-shadow: var(--wood-shadow-medium);
  display: grid;
  gap: 14px;
}

.frame-kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--paper-text);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--paper-bd);
}

.identity-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
  align-items: baseline;
  padding: 10px 12px;
  background: var(--paper-light);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.identity-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--paper-text);
}

.identity-value {
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: -0.01em;
  color: var(--paper-text-strong);
  text-shadow: 1.5px 1.5px 0 rgb(0 0 0 / 0.18);
}

.identity-blurb {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  color: var(--paper-text);
  margin: 0;
}

.setting {
  display: grid;
  gap: 6px;
}

.setting-help {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  color: var(--paper-text);
  margin: 0;
}

.setting-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--paper-text-strong);
  cursor: pointer;
}

.setting-toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
}

.me-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  background: var(--paper-light);
  color: var(--paper-text-strong);
  border: 2px solid var(--paper-bd);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.08em;
  cursor: pointer;
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
  width: max-content;
  transition: background-color 0.12s ease-out;
}

.me-pill:hover {
  background: rgb(228 214 152);
}

.me-pill:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.me-pill.gold {
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border-color: rgb(82 60 18);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
}

.me-pill.gold:hover {
  background: var(--ingot-gold);
}

.me-pill.danger {
  color: var(--element-danger);
}

@media (max-width: 720px) {
  .me-page {
    padding: 14px 0 96px;
  }

  .me-frame {
    padding: 18px;
  }

  .identity-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}
</style>
