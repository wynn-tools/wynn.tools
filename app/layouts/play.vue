<script setup lang="ts">
// Full envelope swap for /play. Replaces the default site nav with the
// Wynncraft Journey-skinned EnvelopeNav (desktop) + BottomHotbar (mobile),
// paints the page over the wood ground with an inset vignette, and runs the
// 250ms cross-page fade transition on every internal /play/* navigation.
//
// Token override is driven by html[data-play="true"], set by play.global
// middleware + the pre-paint script in nuxt.config so first paint is clean.
//
// Pages inside /play receive the envelope automatically by declaring
//   definePageMeta({ layout: 'play' })

import BottomHotbar from '~/components/Play/BottomHotbar.vue'
import EnvelopeNav from '~/components/Play/EnvelopeNav.vue'
</script>

<template>
  <div class="play-shell">
    <div class="wood-ground" aria-hidden="true" />
    <EnvelopeNav />
    <main class="play-content">
      <slot />
    </main>
    <BottomHotbar />
  </div>
</template>

<style scoped>
.play-shell {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Wood ground + inset vignette. The vignette is a radial gradient from
   center to viewport edges, ~8% darker at the corners. No external assets;
   no plank texture; no screenshot. Per Q3 the vignette gives 90% of the
   atmosphere benefit of a real screenshot for zero asset weight. */
.wood-ground {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: radial-gradient(
    ellipse at center,
    var(--theme-col-bg) 0%,
    var(--theme-col-bg) 55%,
    var(--theme-col-bot) 130%
  );
  pointer-events: none;
}

.play-content {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 56px;
}

@media (max-width: 720px) {
  .play-content {
    /* Reserve room for the fixed bottom hotbar + safe-area inset so the win
       screen's COPY RESULT button (and any other bottom-anchored content)
       never sits behind the hotbar. */
    padding: 0 14px calc(96px + env(safe-area-inset-bottom));
  }
}
</style>

<style>
/* Page transition: 180ms fade-out + 220ms fade-in on /play/* → /play/*.
   Opacity only. The EnvelopeNav and BottomHotbar live outside the
   transitioned slot so they stay static through the fade. Disabled under
   prefers-reduced-motion via the global rule in global.css. */
.play-fade-enter-active,
.play-fade-leave-active {
  transition: opacity 220ms cubic-bezier(0.165, 0.84, 0.44, 1);
}

.play-fade-enter-from,
.play-fade-leave-to {
  opacity: 0;
}

.play-fade-leave-active {
  transition-duration: 180ms;
}
</style>
