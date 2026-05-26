<script setup lang="ts">
import { Layers, Map, Plug, Share2, Sword, UserCircle } from '@lucide/vue'

const tools = [
  {
    name: 'Builder',
    desc: 'Plan builds, assign skill points, compare gear.',
    href: '/builder',
    icon: Sword,
  },
  {
    name: 'Map',
    desc: 'Explore the Province of Wynn with live location data.',
    href: '/map',
    icon: Map,
  },
]

const upcoming = [
  {
    name: 'Accounts',
    desc: 'Save builds, lootrun routes, and Wynntils overlays to your profile. Share anything with one link.',
    icon: UserCircle,
  },
  {
    name: 'Sharing',
    desc: 'Permanent links for everything you save. People see exactly what you built, not a screenshot of it.',
    icon: Share2,
  },
  {
    name: 'Overlays',
    desc: 'A community library of Wynntils HUD functions. Find what others have built instead of asking in Discord.',
    icon: Layers,
  },
  {
    name: 'API access',
    desc: 'Bots, spreadsheets, and external tools can pull live data from wynn.tools endpoints.',
    icon: Plug,
  },
]

const wynnicDecor = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
</script>

<template>
  <main>
    <!-- Hero -->
    <section class="hero">
      <div class="hero-wynnic" aria-hidden="true">
        {{ wynnicDecor }}
      </div>
      <div class="hero-content">
        <h1 class="hero-title">
          wynn<span class="hero-dot">.</span>tools
        </h1>
        <p class="hero-sub">
          Open source. Community built.
        </p>
      </div>
    </section>

    <!-- Live tools -->
    <section class="tools" aria-label="Tools">
      <ul class="tool-grid" role="list">
        <li v-for="tool in tools" :key="tool.name">
          <NuxtLink :to="tool.href" class="tool-card">
            <div class="tool-card-icon">
              <component :is="tool.icon" :size="28" aria-hidden="true" />
            </div>
            <div class="tool-card-body">
              <span class="tool-card-name">{{ tool.name }}</span>
              <span class="tool-card-desc">{{ tool.desc }}</span>
            </div>
            <span class="tool-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- Coming next -->
    <section class="upcoming" aria-label="Coming soon">
      <h2 class="upcoming-heading">
        Coming next
      </h2>
      <ul class="upcoming-list" role="list">
        <li v-for="item in upcoming" :key="item.name" class="upcoming-item">
          <component :is="item.icon" :size="16" class="upcoming-item-icon" aria-hidden="true" />
          <span class="upcoming-item-name">{{ item.name }}</span>
          <span class="upcoming-item-desc">{{ item.desc }}</span>
        </li>
      </ul>
    </section>
  </main>

  <footer class="site-footer">
    <span class="footer-note">Open source (AGPL-3.0) · Not affiliated with Wynncraft or Mojang</span>
  </footer>
</template>

<style scoped>
main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── Hero ─────────────────────────────────────────────────────────── */

.hero {
  position: relative;
  padding: 80px 0 64px;
  overflow: hidden;
}

.hero-wynnic {
  position: absolute;
  inset: 0;
  font-family: 'wynn-wynnic', monospace;
  font-size: clamp(48px, 8vw, 96px);
  line-height: 1;
  letter-spacing: 0.04em;
  color: var(--color-accent);
  opacity: 0.05;
  pointer-events: none;
  user-select: none;
  word-break: break-all;
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(48px, 9vw, 96px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--color-text);
  margin-bottom: 16px;
}

.hero-dot {
  color: var(--color-accent);
}

.hero-sub {
  font-size: clamp(15px, 2vw, 17px);
  color: var(--color-muted);
  font-weight: 400;
  max-width: 42ch;
}

/* ── Live tools ───────────────────────────────────────────────────── */

.tools {
  padding-bottom: 64px;
}

.tool-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition:
    background 0.15s ease-out,
    border-color 0.15s ease-out,
    box-shadow 0.15s ease-out;
  min-height: 88px;
}

.tool-card:hover {
  background: var(--color-surface-hi);
  border-color: var(--color-accent-dim);
  box-shadow:
    0 0 0 1px oklch(65% 0.15 48 / 0.12),
    0 4px 16px oklch(0% 0 0 / 0.3);
}

.tool-card:hover .tool-arrow {
  color: var(--color-accent);
  transform: translateX(3px);
}

.tool-card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.tool-card-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(65% 0.15 48 / 0.08);
  border-radius: 8px;
  color: var(--color-accent);
}

.tool-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-card-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.tool-card-desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.4;
}

.tool-arrow {
  font-size: 16px;
  color: var(--color-faint);
  flex-shrink: 0;
  transition:
    color 0.15s ease-out,
    transform 0.15s ease-out;
}

/* ── Upcoming ─────────────────────────────────────────────────────── */

.upcoming {
  padding-bottom: 80px;
}

.upcoming-heading {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin-bottom: 20px;
}

.upcoming-list {
  list-style: none;
  border-top: 1px solid var(--color-border);
}

.upcoming-item {
  display: grid;
  grid-template-columns: 16px 140px 1fr;
  align-items: baseline;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
}

.upcoming-item-icon {
  color: var(--color-faint);
  align-self: center;
}

.upcoming-item-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-muted);
}

.upcoming-item-desc {
  font-size: 13px;
  color: var(--color-faint);
  line-height: 1.5;
}

@media (max-width: 600px) {
  .upcoming-item {
    grid-template-columns: 16px 1fr;
    grid-template-rows: auto auto;
    row-gap: 4px;
  }

  .upcoming-item-icon {
    grid-row: 1;
  }

  .upcoming-item-name {
    grid-row: 1;
  }

  .upcoming-item-desc {
    grid-column: 2;
    grid-row: 2;
  }
}

/* ── Footer ───────────────────────────────────────────────────────── */

.site-footer {
  padding: 20px 40px;
  border-top: 1px solid var(--color-border);
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}

.footer-note {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-faint);
}

@media (max-width: 600px) {
  .hero {
    padding: 56px 0 40px;
  }

  .site-footer {
    padding: 20px;
  }
}
</style>
