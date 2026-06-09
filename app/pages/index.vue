<script setup lang="ts">
import { useDiscordJoin } from '~/composables/useDiscordJoin'

useSeoMeta({
  title: 'wynn.tools — Wynncraft Toolkit',
  ogTitle: 'wynn.tools — Wynncraft Toolkit',
  description: 'Builder, map, item search, and shared builds for Wynncraft. Open source, community built.',
  ogDescription: 'Builder, map, item search, and shared builds for Wynncraft. Open source, community built.',
  twitterCard: 'summary_large_image',
})

interface HomeStats {
  version: { gameVersion: string, fetchedAt: string | null } | null
  builds: { totalPublic: number } | null
  github: { stars: number, contributors: number } | null
}

const { data: stats } = await useFetch<HomeStats>('/api/home-stats', {
  key: 'home-stats',
  default: () => ({ version: null, builds: null, github: null }),
  server: true,
})

const { join: onDiscord } = useDiscordJoin()

const numberFmt = new Intl.NumberFormat('en-US')

function formatStars(n: number): string {
  if (n >= 1000)
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return numberFmt.format(n)
}

function formatRelative(iso: string | null | undefined): string | null {
  if (!iso)
    return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then))
    return null
  const diffMs = Date.now() - then
  const day = 1000 * 60 * 60 * 24
  const days = Math.round(diffMs / day)
  if (days <= 0)
    return 'today'
  if (days === 1)
    return 'yesterday'
  if (days < 30)
    return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12)
    return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

const versionLine = computed(() => {
  const v = stats.value?.version
  if (!v)
    return null
  const rel = formatRelative(v.fetchedAt)
  return rel ? `Tracking ${v.gameVersion} · synced ${rel}` : `Tracking ${v.gameVersion}`
})

const signalParts = computed(() => {
  const out: { key: string, value: string, label: string }[] = []
  const b = stats.value?.builds
  if (b && b.totalPublic > 0)
    out.push({ key: 'builds', value: numberFmt.format(b.totalPublic), label: 'builds shared' })
  const g = stats.value?.github
  if (g) {
    if (g.contributors > 0)
      out.push({ key: 'contributors', value: numberFmt.format(g.contributors), label: g.contributors === 1 ? 'contributor' : 'contributors' })
    if (g.stars > 0)
      out.push({ key: 'stars', value: formatStars(g.stars), label: g.stars === 1 ? 'star' : 'stars' })
  }
  return out
})

interface ShippedRow {
  date: string
  name: string
  desc: string
  href: string
  external?: boolean
}

const shipped: ShippedRow[] = [
  {
    date: '2026-06',
    name: 'Wynndle',
    desc: 'A daily Wynncraft item-guessing game with archive and per-mode streaks.',
    href: '/play/wynndle',
  },
  {
    date: '2026-06',
    name: 'Item inspector',
    desc: 'Paste a Wynntils inspect link to render the in-game tooltip with stat weights.',
    href: '/inspect',
  },
  {
    date: '2026-06',
    name: 'Build sharing v2',
    desc: 'Notes, credits, tutorial links, and tag filters on shared builds.',
    href: '/builds',
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
          The Wynncraft toolkit. Open source, community built.
        </p>
        <div class="hero-actions">
          <NuxtLink to="/builder" class="hero-action">
            Open the builder <span aria-hidden="true">→</span>
          </NuxtLink>
          <a href="https://github.com/wynn-tools/wynn.tools" target="_blank" rel="noopener noreferrer" class="hero-action">
            Follow on GitHub <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Status band -->
    <section class="status" aria-label="Project status">
      <span class="kicker">Status</span>
      <div class="status-body">
        <p v-if="versionLine" class="status-line">
          {{ versionLine }}
        </p>
        <p v-else class="status-line is-pending">
          Tracking ·· · synced ··
        </p>
        <p v-if="signalParts.length" class="status-line">
          <template v-for="(p, i) in signalParts" :key="p.key">
            <span v-if="i > 0" class="status-sep" aria-hidden="true">·</span>
            <span class="status-num">{{ p.value }}</span>
            <span class="status-label">{{ p.label }}</span>
          </template>
        </p>
      </div>
    </section>

    <!-- Recently shipped -->
    <section class="shipped" aria-label="Recently shipped">
      <span class="kicker">Recently shipped</span>
      <ul class="ship-list" role="list">
        <li v-for="row in shipped" :key="row.name">
          <NuxtLink :to="row.href" class="ship-row">
            <span class="ship-date">{{ row.date }}</span>
            <span class="ship-name">{{ row.name }}</span>
            <span class="ship-desc">{{ row.desc }}</span>
            <span class="ship-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- Community footer band -->
    <section class="community" aria-label="Community">
      <span class="kicker">Community</span>
      <div class="community-body">
        <a href="https://github.com/wynn-tools/wynn.tools" target="_blank" rel="noopener noreferrer" class="community-link">
          Source on GitHub <span aria-hidden="true">→</span>
        </a>
        <button type="button" class="community-link" @click="onDiscord">
          Discord <span aria-hidden="true">→</span>
        </button>
        <NuxtLink to="/credits" class="community-link">
          Credits <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <span class="footer-note">
      <a href="https://github.com/wynn-tools/wynn.tools" target="_blank" rel="noopener noreferrer" class="footer-link">Open source (AGPL-3.0)</a>
      · Not affiliated with Wynncraft or Mojang
      · <NuxtLink to="/credits" class="footer-link">Credits</NuxtLink>
    </span>
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
  padding: 88px 0 56px;
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
  font-size: clamp(15px, 1.6vw, 17px);
  color: var(--color-muted);
  font-weight: 400;
  max-width: 48ch;
  margin-bottom: 28px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
}

.hero-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 0.12s ease-out;
}

.hero-action:hover {
  color: var(--color-accent);
}

.hero-action:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
  border-radius: 2px;
}

/* ── Status band ──────────────────────────────────────────────────── */

.status {
  padding: 28px 0;
  border-top: 1px solid var(--color-border);
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 24px;
  align-items: baseline;
}

.status-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.status-line {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.5;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 8px;
}

.status-line.is-pending {
  color: var(--color-faint);
}

.status-num {
  color: var(--color-text);
  font-weight: 500;
}

.status-label {
  color: var(--color-muted);
}

.status-sep {
  color: var(--color-faint);
}

/* ── Recently shipped ─────────────────────────────────────────────── */

.shipped {
  padding: 32px 0 28px;
  border-top: 1px solid var(--color-border);
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 24px;
  align-items: start;
}

.shipped > .kicker {
  padding-top: 2px;
}

.ship-list {
  list-style: none;
  border-top: 1px solid var(--color-border);
}

.ship-row {
  display: grid;
  grid-template-columns: 64px 160px 1fr auto;
  align-items: baseline;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
}

.ship-date {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--color-faint);
}

.ship-name {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
  transition: color 0.12s ease-out;
}

.ship-desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.4;
}

.ship-arrow {
  font-size: 14px;
  color: var(--color-faint);
  flex-shrink: 0;
  transition:
    color 0.12s ease-out,
    transform 0.12s ease-out;
}

.ship-row:hover .ship-name,
.ship-row:hover .ship-arrow {
  color: var(--color-accent);
}

.ship-row:hover .ship-arrow {
  transform: translateX(3px);
}

.ship-row:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* ── Community band ───────────────────────────────────────────────── */

.community {
  padding: 28px 0 64px;
  border-top: 1px solid var(--color-border);
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 24px;
  align-items: baseline;
}

.community-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
}

.community-link {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 0.12s ease-out;
}

.community-link:hover {
  color: var(--color-accent);
}

.community-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
  border-radius: 2px;
}

/* ── Footer ───────────────────────────────────────────────────────── */

.site-footer {
  padding: 20px 40px;
  border-top: 1px solid var(--color-border);
  max-width: var(--shell-max);
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

/* ── Reduced motion ───────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .ship-row:hover .ship-arrow {
    transform: none;
  }
}

/* ── Responsive ───────────────────────────────────────────────────── */

@media (max-width: 720px) {
  .hero {
    padding: 56px 0 36px;
  }

  .hero-title {
    margin-bottom: 12px;
  }

  .hero-sub {
    margin-bottom: 22px;
  }

  .hero-wynnic {
    opacity: 0.035;
    font-size: clamp(40px, 14vw, 72px);
  }

  .status,
  .shipped,
  .community {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 24px 0;
  }

  .shipped > .kicker {
    padding-top: 0;
  }

  .ship-row {
    grid-template-columns: 56px 1fr auto;
    grid-template-rows: auto auto;
    column-gap: 12px;
    row-gap: 2px;
    padding: 12px 0;
  }

  .ship-date {
    grid-column: 1;
    grid-row: 1;
  }

  .ship-name {
    grid-column: 2;
    grid-row: 1;
  }

  .ship-arrow {
    grid-column: 3;
    grid-row: 1;
    align-self: center;
  }

  .ship-desc {
    grid-column: 1 / -1;
    grid-row: 2;
    font-size: 12px;
    padding-left: 0;
  }
}

@media (max-width: 600px) {
  .site-footer {
    padding: 16px 20px;
  }
}
</style>
