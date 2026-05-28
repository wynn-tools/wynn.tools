<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'

useSeoMeta({
  title: 'Credits — wynn.tools',
  description: 'Acknowledgements for the projects, tools, and assets that make wynn.tools possible.',
})

const maintainer = {
  username: 'DevScyu',
  display: 'DevScyu',
  role: 'Creator & Maintainer',
  github: 'https://github.com/DevScyu',
  avatar: 'https://avatars.githubusercontent.com/DevScyu',
}

// Add future contributors here as { username, avatar } objects
const contributors: { username: string, avatar: string }[] = []

const tools = [
  {
    name: 'WynnBuilder',
    description: 'Inspiration for the builder\'s combat math and loadout UI.',
    url: 'https://hppeng-wynn.github.io/builder',
  },
]

const assets = [
  {
    name: 'Wynncraft',
    description: 'All game data, icons, and assets are property of Wynncraft and Mojang. wynn.tools mirrors a subset of these on its own CDN to reduce load on Wynncraft\'s servers — we don\'t claim ownership of any of it.',
    url: 'https://wynncraft.com',
  },
]
</script>

<template>
  <main class="credits-page">
    <!-- Header -->
    <header class="credits-header">
      <h1 class="credits-title">
        Credits
      </h1>
      <p class="credits-sub">
        wynn.tools wouldn't exist without the work of others.
      </p>
    </header>

    <!-- Contributors -->
    <section>
      <h2 class="section-label">
        Contributors
      </h2>

      <div class="maintainer-card">
        <img
          :src="maintainer.avatar"
          :alt="maintainer.display"
          class="maintainer-avatar"
          width="64"
          height="64"
          loading="lazy"
        >
        <div class="maintainer-info">
          <span class="maintainer-name">{{ maintainer.display }}</span>
          <span class="maintainer-role">{{ maintainer.role }}</span>
        </div>
        <a
          :href="maintainer.github"
          target="_blank"
          rel="noopener noreferrer"
          class="maintainer-github"
          :aria-label="`${maintainer.display} on GitHub`"
        >
          <Icon name="mdi:github" size="16" aria-hidden="true" />
        </a>
      </div>

      <ul v-if="contributors.length > 0" class="contributor-grid" role="list">
        <li v-for="c in contributors" :key="c.username" class="contributor-chip">
          <img :src="c.avatar" :alt="c.username" class="chip-avatar" width="48" height="48" loading="lazy">
          <span class="chip-name">{{ c.username }}</span>
        </li>
      </ul>
    </section>

    <!-- Community Tools -->
    <section>
      <h2 class="section-label">
        Community Tools
      </h2>
      <ul class="credit-list" role="list">
        <li v-for="tool in tools" :key="tool.name" class="credit-card">
          <div class="credit-card-body">
            <span class="credit-name">{{ tool.name }}</span>
            <span class="credit-desc">{{ tool.description }}</span>
          </div>
          <a
            v-if="tool.url"
            :href="tool.url"
            target="_blank"
            rel="noopener noreferrer"
            class="credit-link"
            :aria-label="`Visit ${tool.name}`"
          >
            <ExternalLink :size="14" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </section>

    <!-- Game & Assets -->
    <section>
      <h2 class="section-label">
        Game &amp; Assets
      </h2>
      <ul class="credit-list" role="list">
        <li v-for="asset in assets" :key="asset.name" class="credit-card">
          <div class="credit-card-body">
            <span class="credit-name">{{ asset.name }}</span>
            <span class="credit-desc">{{ asset.description }}</span>
          </div>
          <a
            v-if="asset.url"
            :href="asset.url"
            target="_blank"
            rel="noopener noreferrer"
            class="credit-link"
            :aria-label="`Visit ${asset.name}`"
          >
            <ExternalLink :size="14" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </section>

    <!-- Footer note -->
    <footer class="credits-footer">
      <p>
        Think something's missing?
        <a
          href="https://github.com/wynn-tools/wynn.tools/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
        >Open an issue</a> on GitHub.
      </p>
    </footer>
  </main>
</template>

<style scoped>
.credits-page {
  flex: 1;
  max-width: 860px;
  padding: 64px 0 80px;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

/* ── Header ── */

.credits-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.credits-title {
  font-family: var(--font-display);
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--color-text);
}

.credits-sub {
  font-size: 15px;
  color: var(--color-muted);
}

/* ── Section label ── */

.section-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin-bottom: 20px;
}

/* ── Maintainer card ── */

.maintainer-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.maintainer-avatar {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  flex-shrink: 0;
  object-fit: cover;
}

.maintainer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.maintainer-name {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.maintainer-role {
  font-size: 13px;
  color: var(--color-muted);
}

.maintainer-github {
  color: var(--color-faint);
  display: flex;
  align-items: center;
  transition: color 0.15s;

  &:hover {
    color: var(--color-text);
  }
}

/* ── Community contributor grid ── */

.contributor-grid {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}

.contributor-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 64px;
}

.chip-avatar {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
}

.chip-name {
  font-size: 11px;
  color: var(--color-muted);
  text-align: center;
  word-break: break-word;
}

/* ── Credit cards ── */

.credit-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.credit-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition:
    background 0.15s ease-out,
    border-color 0.15s ease-out;

  &:hover {
    background: var(--color-surface-hi);
    border-color: var(--color-accent-dim);
  }
}

.credit-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.credit-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.credit-desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.5;
}

.credit-link {
  color: var(--color-faint);
  display: flex;
  align-items: center;
  padding-top: 2px;
  flex-shrink: 0;
  transition: color 0.15s;

  &:hover {
    color: var(--color-text);
  }
}

/* ── Footer note ── */

.credits-footer {
  padding-top: 32px;
  border-top: 1px solid var(--color-border);
  font-size: 13px;
  color: var(--color-muted);
}

.footer-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: var(--color-text);
  }
}

@media (max-width: 600px) {
  .credits-page {
    padding: 40px 0 60px;
    gap: 36px;
  }
}
</style>
