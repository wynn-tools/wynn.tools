<script setup lang="ts">
import { FileClock, Hammer, Map, Search, Sword } from '@lucide/vue'

const tools = [
  { name: 'Builder', href: '/builder', icon: Sword },
  { name: 'Crafter', href: '/crafter', icon: Hammer },
  { name: 'Items', href: '/items', icon: Search },
  { name: 'Map', href: '/map', icon: Map },
  { name: 'Changelog', href: '/changelog', icon: FileClock },
]
</script>

<template>
  <nav class="site-nav" aria-label="Main navigation">
    <div class="nav-inner">
      <NuxtLink to="/" class="nav-logo" aria-label="wynn.tools home">
        <span class="logo-text">wynn<span class="logo-dot">.</span>tools</span>
      </NuxtLink>

      <ul class="nav-links" role="list">
        <li v-for="tool in tools" :key="tool.name">
          <NuxtLink :to="tool.href" class="nav-link">
            <component :is="tool.icon" :size="16" class="nav-icon" aria-hidden="true" />
            <span class="nav-label">{{ tool.name }}</span>
          </NuxtLink>
        </li>
      </ul>
      <NavUser />
    </div>
  </nav>
</template>

<style scoped>
.site-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: oklch(14% 0.006 30 / 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 0 40px;
  height: 52px;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}

.nav-logo {
  text-decoration: none;
  flex-shrink: 0;
}

.logo-text {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--color-text);
  transition: color 0.12s ease-out;
}

.logo-dot {
  color: var(--color-accent);
}

.nav-logo:hover .logo-text {
  color: var(--color-accent);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
  list-style: none;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.nav-link.router-link-active {
  color: var(--color-accent);
  background: oklch(65% 0.15 48 / 0.08);
}

.nav-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.nav-icon {
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .nav-inner {
    padding: 0 20px;
  }

  .nav-label {
    display: none;
  }

  .nav-link {
    padding: 6px 8px;
  }
}
</style>
