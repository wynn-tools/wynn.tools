<script setup lang="ts">
// Fixed-position bottom navigation visible only below 720px. Five inventory
// slot cells (Hub / Wynndle / Archive / Leaderboard / Me) sit in a wood-frame
// strip. Identity-persistent: never hides on scroll. Replaces the desktop
// pill rail on phones.

import { House, UserRound } from '@lucide/vue'

const route = useRoute()

// Envelope nav stays game-agnostic — Hub + Me only. Individual games own
// their internal navigation (archive, leaderboard, mode tabs) inside their
// own sub-routes.
const navItems: { name: string, href: string, icon: typeof House, match: (path: string) => boolean }[] = [
  { name: 'Hub', href: '/play', icon: House, match: p => p === '/play' },
  { name: 'Me', href: '/play/me', icon: UserRound, match: p => p === '/play/me' || p.startsWith('/play/me/') },
]
</script>

<template>
  <nav class="hotbar" aria-label="Play navigation">
    <div class="strip">
      <NuxtLink
        v-for="item in navItems"
        :key="item.href"
        :to="item.href"
        class="slot"
        :class="{ 'is-active': item.match(route.path) }"
      >
        <component :is="item.icon" :size="22" :stroke-width="2" class="slot-icon" />
        <span class="slot-label">{{ item.name }}</span>
      </NuxtLink>
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
  transition:
    background-color 0.12s ease-out,
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.slot:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.slot-icon {
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

@media (max-width: 720px) {
  .hotbar {
    display: block;
  }
}
</style>
