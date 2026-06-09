<script setup lang="ts">
import { ArrowRight, BookMarked, Crown, Shield, Sword } from '@lucide/vue'

definePageMeta({
  layout: 'play',
  pageTransition: { name: 'play-fade', mode: 'out-in' },
})

useSeoMeta({ title: 'Wynndle · wynn.tools', description: 'Daily Wynncraft item guessing game.' })

const modes = [
  {
    label: 'Weapon',
    href: '/play/wynndle/weapon',
    blurb: 'Guess today\'s weapon by class, level, DPS, speed, rarity, powders, and elements.',
    icon: Sword,
  },
  {
    label: 'Armor',
    href: '/play/wynndle/armor',
    blurb: 'Guess today\'s armor by type, level, health, rarity, powders, elements, and skill reqs.',
    icon: Shield,
  },
]
</script>

<template>
  <section class="wynndle-hub">
    <header class="wh-header">
      <span class="wh-kicker">WYNNDLE</span>
      <h1 class="wh-title">
        Two modes, ten guesses.
      </h1>
      <p class="wh-blurb">
        Pick the gear type, deduce today's item from the feedback grid.
      </p>
    </header>

    <div class="wh-modes">
      <NuxtLink
        v-for="m in modes"
        :key="m.href"
        :to="m.href"
        class="wh-mode"
      >
        <component :is="m.icon" :size="40" :stroke-width="1.6" class="wh-mode-icon" />
        <h2 class="wh-mode-label">
          {{ m.label }}
        </h2>
        <p class="wh-mode-blurb">
          {{ m.blurb }}
        </p>
        <span class="wh-mode-arrow">
          PLAY <ArrowRight :size="14" :stroke-width="2.5" />
        </span>
      </NuxtLink>
    </div>

    <!-- Game-level navigation: archive + leaderboard belong to Wynndle, not
         to the envelope. They live here in the game's sub-hub. -->
    <nav class="wh-extras" aria-label="Wynndle extras">
      <NuxtLink to="/play/wynndle/archive" class="wh-extra">
        <BookMarked :size="18" :stroke-width="2" />
        <span class="wh-extra-label">Archive</span>
        <span class="wh-extra-blurb">Past Wynndle puzzles, your results.</span>
      </NuxtLink>
      <NuxtLink to="/play/wynndle/leaderboard" class="wh-extra">
        <Crown :size="18" :stroke-width="2" />
        <span class="wh-extra-label">Leaderboard</span>
        <span class="wh-extra-blurb">Today's fastest solves, per mode.</span>
      </NuxtLink>
    </nav>
  </section>
</template>

<style scoped>
.wynndle-hub {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 0 64px;
  display: grid;
  gap: 32px;
}

.wh-header {
  text-align: center;
  display: grid;
  gap: 8px;
  padding: 18px 0;
}

.wh-kicker {
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

.wh-title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 52px);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--paper-base);
  margin: 6px 0 4px;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.3);
}

.wh-blurb {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--paper-light);
  margin: 0;
}

.wh-modes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.wh-mode {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 28px 24px 22px;
  background: var(--paper-base);
  border: 2px solid var(--paper-bd);
  box-shadow: var(--wood-shadow-medium);
  color: var(--paper-text);
  text-decoration: none;
  transition: background-color 0.12s ease-out;
}

.wh-mode:hover {
  background: var(--paper-light);
}

.wh-mode:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.wh-mode-icon {
  color: var(--paper-text-strong);
}

.wh-mode-label {
  font-family: var(--font-display);
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--paper-text-strong);
  margin: 4px 0 0;
  text-shadow: 1.5px 1.5px 0 rgb(0 0 0 / 0.18);
}

.wh-mode-blurb {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  color: var(--paper-text);
  margin: 0;
}

.wh-mode-arrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border: 2px solid rgb(82 60 18);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  width: max-content;
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
  transition: background-color 0.12s ease-out;
}

.wh-mode:hover .wh-mode-arrow {
  background: var(--ingot-gold);
}

.wh-extras {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.wh-extra {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 12px;
  align-items: center;
  padding: 14px 18px;
  background: var(--paper-base);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
  color: var(--paper-text);
  text-decoration: none;
  transition: background-color 0.12s ease-out;
}

.wh-extra:hover {
  background: var(--paper-light);
}

.wh-extra:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.wh-extra > svg {
  grid-row: 1 / 3;
  color: var(--paper-text-strong);
}

.wh-extra-label {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--paper-text-strong);
}

.wh-extra-blurb {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--paper-text);
}

@media (max-width: 640px) {
  .wynndle-hub {
    padding: 12px 0 24px;
    gap: 18px;
  }

  .wh-header {
    padding: 10px 0;
  }

  .wh-modes {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .wh-mode {
    padding: 20px 18px 16px;
  }

  .wh-mode-icon {
    width: 32px;
    height: 32px;
  }

  .wh-mode-label {
    font-size: 26px;
  }

  .wh-extras {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
