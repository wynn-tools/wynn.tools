<script setup lang="ts">
// Top wood-frame band (80px desktop / 56px mobile) plus, on desktop only, a
// parchment pill rail beneath it. Mobile hides the pill rail and relies on
// the BottomHotbar fixed at the bottom of the viewport for navigation.

import { ArrowLeft } from '@lucide/vue'

const route = useRoute()

// The envelope nav stays game-agnostic. /play is the hub for many games;
// individual games own their own sub-navigation (Wynndle's Weapon/Armor/
// Archive/Leaderboard live inside /play/wynndle/* and surface on the game's
// own pages, not in the envelope chrome). Promoting one game into the
// envelope nav would pin the architecture to "this is the Wynndle envelope"
// — wrong shape for the multi-game hub the Play Hall is.
const navItems: { name: string, href: string, match: (path: string) => boolean }[] = [
  { name: 'Hub', href: '/play', match: p => p === '/play' },
  { name: 'Me', href: '/play/me', match: p => p === '/play/me' || p.startsWith('/play/me/') },
]
</script>

<template>
  <header class="envelope-nav">
    <div class="band">
      <NuxtLink to="/" class="exit" aria-label="Leave Play, return to wynn.tools">
        <ArrowLeft :size="14" :stroke-width="2.5" />
        <span>wynn.tools</span>
      </NuxtLink>
      <NuxtLink to="/play" class="wordmark" aria-label="Play Hub">
        <span class="wordmark-brand">WYNN<span class="wordmark-dot">.</span>TOOLS</span>
        <span class="wordmark-sep">·</span>
        <span class="wordmark-section">PLAY</span>
      </NuxtLink>
      <div class="trailing" aria-hidden="true" />
    </div>
    <nav class="pill-rail" aria-label="Play sections">
      <NuxtLink
        v-for="item in navItems"
        :key="item.href"
        :to="item.href"
        class="pill"
        :class="{ 'is-active': item.match(route.path) }"
      >
        {{ item.name }}
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.envelope-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  isolation: isolate;
}

/* Top wood-frame band: the heavy 6-layer nested shadow stack runs as
   box-shadow on the band itself. We add ~24px of vertical breathing room
   above + below so the outer shadows don't visually crash into surrounding
   content (the band's "frame" extends 18px beyond its box). */
.band {
  position: relative;
  width: min(100%, 1200px);
  height: 56px;
  margin: 28px auto 22px;
  background: var(--paper-base);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 28px;
  box-shadow: var(--wood-shadow-heavy);
}

.exit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  color: var(--paper-text);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 2px;
  transition:
    color 0.12s ease-out,
    background-color 0.12s ease-out;
}

.exit:hover {
  color: var(--ingot-gold);
  background: rgb(0 0 0 / 0.08);
}

.exit:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.wordmark {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  justify-self: center;
  color: var(--paper-text-strong);
  font-family: var(--font-display);
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.01em;
  text-decoration: none;
  white-space: nowrap;
  text-shadow: 1px 1px 0 rgb(0 0 0 / 0.18);
}

.wordmark-brand {
  display: inline-flex;
  align-items: baseline;
}

.wordmark-dot {
  color: var(--primary);
  margin: 0 1px;
}

.wordmark-sep {
  color: var(--paper-text);
  opacity: 0.55;
  font-size: 26px;
}

.wordmark-section {
  color: var(--paper-text);
  opacity: 0.72;
  letter-spacing: 0.02em;
}

.trailing {
  justify-self: end;
  width: 40px;
}

/* Parchment pill rail: 44px tall, centered, pills flow inline. Active pill
   gets the gold-edged variant per the Wynncraft Journey nav button gold
   treatment (--img-nav-gold-button-bg in their tokens) — we render it via
   layered borders + a primary-green underline since we're not hot-linking
   their SVG assets. */
.pill-rail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 28px;
  padding: 4px;
  background: rgb(65 38 36 / 0.32);
  border: 2px solid var(--paper-bd);
  border-radius: 2px;
}

.pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 18px;
  background: var(--paper-base);
  color: var(--paper-text);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  border: 2px solid var(--paper-bd);
  border-radius: 2px;
  white-space: nowrap;
  transition:
    background-color 0.12s ease-out,
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.pill:hover {
  background: var(--paper-light);
  color: var(--paper-text-strong);
}

.pill:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.pill.is-active {
  background: var(--ingot-gold-dim);
  color: rgb(48 32 22);
  border-color: rgb(82 60 18);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
}

/* ── Mobile ────────────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .band {
    height: 48px;
    margin: 14px 10px 16px;
    padding: 0 14px;
    grid-template-columns: auto 1fr auto;
  }

  .exit span {
    display: none;
  }

  .wordmark {
    font-size: 22px;
    gap: 6px;
  }

  .wordmark-sep {
    font-size: 18px;
  }

  .pill-rail {
    display: none;
  }
}
</style>
