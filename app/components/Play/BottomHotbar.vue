<script setup lang="ts">
// Fixed-position bottom navigation visible only below 720px. Two inventory
// slot cells (Hub + identity) in a wood-frame strip. Identity-persistent:
// never hides on scroll. Replaces the desktop pill rail on phones.

import { House, LogIn, UserRound } from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const onMePage = computed(() => {
  const p = route.path
  return p === '/play/me' || p.startsWith('/play/me/')
})

const onHubPage = computed(() => route.path === '/play')

function avatarUrl(discordId: string, avatar: string) {
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=64`
}
</script>

<template>
  <nav class="hotbar" aria-label="Play navigation">
    <div class="strip">
      <NuxtLink
        to="/play"
        class="slot"
        :class="{ 'is-active': onHubPage }"
      >
        <House :size="22" :stroke-width="2" class="slot-icon" />
        <span class="slot-label">Hub</span>
      </NuxtLink>

      <!-- Right slot: pending → empty placeholder; signed-in → /play/me link
           with avatar; signed-out → gold-edged sign-in button. -->
      <span v-if="auth.pending" class="slot slot--placeholder" aria-hidden="true" />

      <NuxtLink
        v-else-if="auth.user"
        to="/play/me"
        class="slot"
        :class="{ 'is-active': onMePage }"
        :aria-label="`Open your Play profile, signed in as ${auth.user.displayName ?? auth.user.username}`"
      >
        <img
          v-if="auth.user.avatar"
          :src="avatarUrl(auth.user.discordId, auth.user.avatar)"
          alt=""
          class="slot-avatar"
          width="22"
          height="22"
        >
        <UserRound v-else :size="22" :stroke-width="2" class="slot-icon" />
        <span class="slot-label">Me</span>
      </NuxtLink>

      <button
        v-else
        type="button"
        class="slot slot--signin"
        aria-label="Sign in with Discord"
        @click="auth.login()"
      >
        <LogIn :size="22" :stroke-width="2" class="slot-icon" />
        <span class="slot-label">Sign in</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.hotbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  padding: 14px 12px calc(12px + env(safe-area-inset-bottom));
  background: var(--theme-col-bg);
  box-shadow: var(--wood-shadow-mobile-heavy);
  display: none;
}

.strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 140px));
  gap: 8px;
  justify-content: center;
}

.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 56px;
  background: rgb(137 118 101);
  color: rgb(232 220 198);
  border: 2px solid var(--paper-bd);
  text-decoration: none;
  font: inherit;
  cursor: pointer;
  transition:
    background-color 0.12s ease-out,
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.slot:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.slot--placeholder {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.slot-icon {
  flex-shrink: 0;
}

.slot-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgb(232 220 198 / 0.6);
  flex-shrink: 0;
}

.slot-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1;
}

.slot.is-active {
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border-color: rgb(82 60 18);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
}

.slot.is-active .slot-avatar {
  border-color: rgb(82 60 18);
}

/* Signed-out sign-in slot: gold-active treatment as the primary action,
   matching the /play/me .me-pill.gold and the desktop NavPlayUser pill. */
.slot--signin {
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border-color: rgb(82 60 18);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
}

.slot--signin:hover {
  background: var(--ingot-gold);
}

@media (max-width: 720px) {
  .hotbar {
    display: block;
  }
}
</style>
