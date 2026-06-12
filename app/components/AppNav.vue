<script setup lang="ts">
import { CalendarClock, ChevronDown, Compass, FileClock, Gamepad2, Hammer, LayoutList, Map, Menu, Package, ScanLine, Search, Sword, X } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'
import { useDiscordJoin } from '~/composables/useDiscordJoin'

const route = useRoute()
const { join: onDiscord } = useDiscordJoin()

const dropdownGroups = [
  {
    label: 'Build',
    icon: Sword,
    items: [
      { name: 'Builder', href: '/builder', icon: Sword, desc: 'Create and plan builds' },
      { name: 'Builds', href: '/builds', icon: LayoutList, desc: 'Browse community builds' },
    ],
  },
  {
    label: 'Craft',
    icon: Hammer,
    items: [
      { name: 'Crafter', href: '/crafter', icon: Hammer, desc: 'Create crafted items' },
      { name: 'Crafted', href: '/crafted', icon: Package, desc: 'Browse community crafted' },
    ],
  },
  {
    label: 'Discover',
    icon: Compass,
    items: [
      { name: 'Items', href: '/items', icon: Search, desc: 'Search Wynncraft items and ingredients' },
      { name: 'Inspect', href: '/inspect', icon: ScanLine, desc: 'Render a Wynntils inspect link' },
      { name: 'Map', href: '/map', icon: Map, desc: 'Explore the Province of Wynn' },
      { name: 'World Events', href: '/world-events', icon: CalendarClock, desc: 'Browse world event schedules and loot' },
      { name: 'Changelog', href: '/changelog', icon: FileClock, desc: 'Track Wynncraft item data changes' },
    ],
  },
]

interface StandaloneItem {
  name: string
  href: string
  icon: typeof Search
}

const standalone: StandaloneItem[] = [
  { name: 'Play', href: '/play', icon: Gamepad2 },
]

// Desktop dropdowns
const openGroup = ref<string | null>(null)

function isGroupActive(group: typeof dropdownGroups[number]) {
  return group.items.some(item => route.path.startsWith(item.href))
}

// Mobile menu
const mobileOpen = ref(false)
const navRef = ref<HTMLElement | null>(null)

onClickOutside(navRef, () => {
  mobileOpen.value = false
})

watch(() => route.path, () => {
  mobileOpen.value = false
})
</script>

<template>
  <nav ref="navRef" class="site-nav" aria-label="Main navigation">
    <div class="nav-inner">
      <NuxtLink to="/" class="nav-logo" aria-label="wynn.tools home">
        <span class="logo-text">wynn<span class="logo-dot">.</span>tools</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <div class="nav-tools" aria-hidden="false">
        <div
          v-for="group in dropdownGroups"
          :key="group.label"
          class="nav-dropdown-wrap"
          @mouseenter="openGroup = group.label"
          @mouseleave="openGroup = null"
        >
          <button
            class="nav-link nav-dropdown-trigger"
            :class="{ 'is-group-active': isGroupActive(group) }"
            type="button"
            :aria-expanded="openGroup === group.label"
            :aria-haspopup="true"
          >
            <component :is="group.icon" :size="16" class="nav-icon" aria-hidden="true" />
            <span class="nav-label">{{ group.label }}</span>
            <ChevronDown :size="12" class="nav-chevron" :class="{ 'is-open': openGroup === group.label }" aria-hidden="true" />
          </button>

          <Transition name="dropdown">
            <div v-if="openGroup === group.label" class="nav-dropdown" role="menu">
              <NuxtLink
                v-for="item in group.items"
                :key="item.name"
                :to="item.href"
                class="nav-dropdown-item"
                role="menuitem"
                @click="openGroup = null"
              >
                <component :is="item.icon" :size="14" class="nav-dropdown-item-icon" aria-hidden="true" />
                <span class="nav-dropdown-item-body">
                  <span class="nav-dropdown-item-name">{{ item.name }}</span>
                  <span class="nav-dropdown-item-desc">{{ item.desc }}</span>
                </span>
              </NuxtLink>
            </div>
          </Transition>
        </div>

        <ul class="nav-group" role="list">
          <li v-for="tool in standalone" :key="tool.name">
            <NuxtLink :to="tool.href" class="nav-link">
              <component :is="tool.icon" :size="16" class="nav-icon" aria-hidden="true" />
              <span class="nav-label">{{ tool.name }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div class="nav-trailing">
        <button
          type="button"
          class="nav-utility"
          aria-label="Join Discord"
          title="Join Discord"
          @click="onDiscord"
        >
          <Icon name="logos:discord-icon" size="16" aria-hidden="true" />
        </button>
        <ThemePicker />
        <NavUser />
      </div>

      <!-- Mobile hamburger -->
      <button
        class="nav-hamburger"
        type="button"
        :aria-expanded="mobileOpen"
        aria-label="Open navigation"
        @click="mobileOpen = !mobileOpen"
      >
        <component :is="mobileOpen ? X : Menu" :size="20" aria-hidden="true" />
      </button>
    </div>

    <!-- Mobile menu panel -->
    <Transition name="mobile-menu">
      <div v-if="mobileOpen" class="mobile-menu" role="dialog" aria-label="Navigation">
        <!-- Grouped sections -->
        <div v-for="group in dropdownGroups" :key="group.label" class="mobile-section">
          <span class="mobile-section-label">
            <component :is="group.icon" :size="12" aria-hidden="true" />
            {{ group.label }}
          </span>
          <NuxtLink
            v-for="item in group.items"
            :key="item.name"
            :to="item.href"
            class="mobile-item"
          >
            <component :is="item.icon" :size="16" class="mobile-item-icon" aria-hidden="true" />
            <span class="mobile-item-body">
              <span class="mobile-item-name">{{ item.name }}</span>
              <span class="mobile-item-desc">{{ item.desc }}</span>
            </span>
          </NuxtLink>
        </div>

        <!-- Standalone links -->
        <div class="mobile-section mobile-section--flat">
          <NuxtLink
            v-for="tool in standalone"
            :key="tool.name"
            :to="tool.href"
            class="mobile-item mobile-item--flat"
          >
            <component :is="tool.icon" :size="16" class="mobile-item-icon" aria-hidden="true" />
            <span class="mobile-item-name">{{ tool.name }}</span>
          </NuxtLink>
          <button
            type="button"
            class="mobile-item mobile-item--flat"
            @click="onDiscord"
          >
            <Icon name="logos:discord-icon" size="16" class="mobile-item-icon" aria-hidden="true" />
            <span class="mobile-item-name">Discord</span>
          </button>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<style scoped>
.site-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in oklch, var(--color-bg) 92%, transparent);
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
  max-width: var(--shell-max);
  margin: 0 auto;
  width: 100%;
}

/* ── Logo ───────────────────────────────────────────────────────────── */

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

/* ── Desktop nav tools ──────────────────────────────────────────────── */

.nav-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-trailing {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.nav-utility {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.nav-utility:hover {
  background: var(--color-surface);
}

.nav-utility:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 2px;
  list-style: none;
  padding-left: 16px;
  margin-left: 12px;
  border-left: 1px solid var(--color-border);
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

button.nav-link {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.nav-link.router-link-active {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}

.nav-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.nav-icon {
  flex-shrink: 0;
}

/* ── Desktop dropdown trigger ───────────────────────────────────────── */

.nav-dropdown-trigger {
  background: none;
  border: none;
  cursor: pointer;
}

.nav-dropdown-trigger.is-group-active {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}

.nav-chevron {
  flex-shrink: 0;
  color: var(--color-faint);
  transition: transform 0.15s ease-out;
}

.nav-chevron.is-open {
  transform: rotate(180deg);
}

/* ── Desktop dropdown panel ─────────────────────────────────────────── */

.nav-dropdown-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.nav-dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: color-mix(in oklch, var(--color-surface) 96%, transparent);
  background-clip: padding-box;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid color-mix(in oklch, var(--color-accent) 20%, transparent);
  border-top: 4px solid transparent;
  border-radius: 8px;
  padding: 4px;
  min-width: 200px;
  box-shadow: 0 4px 24px oklch(0% 0 0 / 0.3);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--color-muted);
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.nav-dropdown-item:hover {
  color: var(--color-text);
  background: var(--color-surface-hi);
}

.nav-dropdown-item.router-link-active {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}

.nav-dropdown-item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.nav-dropdown-item-icon {
  flex-shrink: 0;
  color: inherit;
}

.nav-dropdown-item-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.nav-dropdown-item-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

.nav-dropdown-item-desc {
  font-size: 11px;
  color: var(--color-faint);
  line-height: 1.3;
}

/* ── Desktop dropdown transition ────────────────────────────────────── */

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.12s ease-out,
    transform 0.12s ease-out;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

/* ── Mobile hamburger ───────────────────────────────────────────────── */

.nav-hamburger {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.nav-hamburger:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.nav-hamburger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* ── Mobile menu panel ──────────────────────────────────────────────── */

.mobile-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: color-mix(in oklch, var(--color-bg) 97%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  padding: 8px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 49;
}

.mobile-section {
  display: flex;
  flex-direction: column;
  padding-top: 8px;
}

.mobile-section + .mobile-section {
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
}

.mobile-section--flat {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 2px;
}

.mobile-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  padding: 0 12px 4px;
}

.mobile-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--color-muted);
  min-height: 44px;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

button.mobile-item {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.mobile-item:active {
  background: var(--color-surface);
}

.mobile-item.router-link-active {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}

.mobile-item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.mobile-item--flat {
  flex: 0 0 auto;
}

.mobile-item-icon {
  flex-shrink: 0;
  color: inherit;
}

.mobile-item-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.mobile-item-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
}

.mobile-item-desc {
  font-size: 12px;
  color: var(--color-faint);
  line-height: 1.3;
}

/* ── Mobile menu transition ─────────────────────────────────────────── */

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition:
    opacity 0.15s ease-out,
    transform 0.15s ease-out;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Responsive ─────────────────────────────────────────────────────── */

@media (max-width: 720px) {
  .nav-inner {
    padding: 0 20px;
    gap: 8px;
  }

  .nav-tools {
    display: none;
  }

  /* With the desktop tools hidden, space-between would strand the theme +
     account controls in the middle of the bar. Push the trailing cluster (and
     the hamburger after it) to the right so they group at the edge. */
  .nav-trailing {
    margin-left: auto;
  }

  /* 44px touch target (was 36) for the primary mobile control. */
  .nav-hamburger {
    display: flex;
    width: 44px;
    height: 44px;
  }

  /* Discord is reached through the mobile sheet instead of the trailing cluster. */
  .nav-utility {
    display: none;
  }
}
</style>
