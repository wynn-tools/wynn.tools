<script setup lang="ts">
import { FileClock, Hammer, Layers, LayoutList, Map, Package, Plug, Search, Sword } from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'

useSeoMeta({
  title: 'wynn.tools — Wynncraft Toolkit',
  ogTitle: 'wynn.tools — Wynncraft Toolkit',
  description: 'Build calculator, interactive map, item search, and more for Wynncraft.',
  ogDescription: 'Build calculator, interactive map, item search, and more for Wynncraft.',
  twitterCard: 'summary_large_image',
})

const auth = useAuthStore()

const toolGroups = [
  {
    label: 'Build',
    tools: [
      { name: 'Builder', desc: 'Plan builds, compare gear, and assign skill points.', href: '/builder', icon: Sword },
      { name: 'Builds', desc: 'Browse builds shared by the community.', href: '/builds', icon: LayoutList },
    ],
  },
  {
    label: 'Craft',
    tools: [
      { name: 'Crafter', desc: 'Simulate crafted items with ingredient combinations.', href: '/crafter', icon: Hammer },
      { name: 'Crafted', desc: 'Browse crafted gear shared by the community.', href: '/crafted', icon: Package },
    ],
  },
  {
    label: 'Discover',
    tools: [
      { name: 'Items', desc: 'Search and filter Wynncraft items and ingredients.', href: '/items', icon: Search },
      { name: 'Map', desc: 'Explore the Province of Wynn with live location data.', href: '/map', icon: Map },
      { name: 'Changelog', desc: 'Track changes across Wynncraft data versions.', href: '/changelog', icon: FileClock },
    ],
  },
]

const upcoming = [
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

    <!-- Tools -->
    <section class="tools" aria-label="Tools">
      <div
        v-for="group in toolGroups"
        :key="group.label"
        class="tool-group"
      >
        <div class="group-rule" aria-hidden="true">
          <span class="group-rule-label">{{ group.label }}</span>
        </div>
        <ul class="tool-list" role="list">
          <li v-for="tool in group.tools" :key="tool.name">
            <NuxtLink :to="tool.href" class="tool-row">
              <component :is="tool.icon" :size="16" class="tool-row-icon" aria-hidden="true" />
              <span class="tool-row-name">{{ tool.name }}</span>
              <span class="tool-row-desc">{{ tool.desc }}</span>
              <span class="tool-row-arrow" aria-hidden="true">→</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- Accounts strip -->
    <div v-if="!auth.pending" class="accounts-strip">
      <template v-if="auth.user">
        <span class="accounts-strip-text">Signed in as {{ auth.user.displayName ?? auth.user.username }}.</span>
        <NuxtLink to="/me/profile" class="accounts-strip-link">
          Your profile →
        </NuxtLink>
      </template>
      <template v-else>
        <span class="accounts-strip-text">Profiles and build sharing are live.</span>
        <button type="button" class="accounts-strip-link" @click="auth.login()">
          Sign in →
        </button>
      </template>
    </div>

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
    <span class="footer-note"><a href="https://github.com/wynn-tools/wynn.tools" target="_blank" rel="noopener noreferrer" class="footer-link">Open source (AGPL-3.0)</a> · Not affiliated with Wynncraft or Mojang · <NuxtLink to="/credits" class="footer-link">Credits</NuxtLink></span>
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
  padding: 80px 0 80px;
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

/* ── Tools ────────────────────────────────────────────────────────── */

.tools {
  padding-bottom: 40px;
}

.tool-group + .tool-group {
  margin-top: 32px;
}

.group-rule {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0;
}

.group-rule::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.group-rule-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  flex-shrink: 0;
}

.tool-list {
  list-style: none;
}

.tool-row {
  display: grid;
  grid-template-columns: 16px 140px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
}

.tool-row:hover .tool-row-name,
.tool-row:hover .tool-row-icon,
.tool-row:hover .tool-row-arrow {
  color: var(--color-accent);
}

.tool-row:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.tool-row-icon {
  color: var(--color-faint);
  transition: color 0.12s ease-out;
}

.tool-row-name {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
  transition: color 0.12s ease-out;
}

.tool-row-desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.4;
}

.tool-row-arrow {
  font-size: 14px;
  color: var(--color-faint);
  flex-shrink: 0;
  transition:
    color 0.12s ease-out,
    transform 0.12s ease-out;
}

.tool-row:hover .tool-row-arrow {
  transform: translateX(3px);
}

/* ── Accounts strip ───────────────────────────────────────────────── */

.accounts-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
  margin-bottom: 48px;
}

.accounts-strip-text {
  font-size: 13px;
  color: var(--color-faint);
}

.accounts-strip-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-accent);
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 0.12s ease-out;

  &:hover {
    color: var(--color-text);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-radius: 2px;
  }
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

.footer-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: var(--color-muted);
  }
}

/* ── Responsive ───────────────────────────────────────────────────── */

@media (max-width: 720px) {
  .hero {
    padding: 48px 0 32px;
  }

  .hero-title {
    margin-bottom: 12px;
  }

  .hero-wynnic {
    opacity: 0.035;
    font-size: clamp(40px, 14vw, 72px);
  }

  .tools {
    padding-bottom: 24px;
  }

  .tool-group + .tool-group {
    margin-top: 24px;
  }

  .tool-row {
    grid-template-columns: 16px 1fr auto;
    grid-template-rows: auto auto;
    gap: 2px 10px;
    padding: 12px 0;
  }

  .tool-row-icon {
    grid-column: 1;
    grid-row: 1;
    align-self: center;
  }

  .tool-row-name {
    grid-column: 2;
    grid-row: 1;
  }

  .tool-row-arrow {
    grid-column: 3;
    grid-row: 1;
    align-self: center;
  }

  .tool-row-desc {
    grid-column: 2 / 4;
    grid-row: 2;
    font-size: 12px;
  }

  .accounts-strip {
    margin-bottom: 28px;
  }

  .upcoming {
    padding-bottom: 56px;
  }

  .upcoming-heading {
    margin-bottom: 14px;
  }

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

@media (max-width: 600px) {
  .site-footer {
    padding: 16px 20px;
  }
}
</style>
