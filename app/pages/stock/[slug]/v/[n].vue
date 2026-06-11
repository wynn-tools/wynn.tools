<script setup lang="ts">
import type { StockListItem } from '~/lib/types/stock'
import StockPartView from '~/components/stock/StockPartView.vue'
import { CLASS_THEMES, classWeaponUrl } from '~/lib/build/class-theme'

function avatarUrl(discordId: string, avatar: string) {
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=64`
}

const route = useRoute()
const slug = String(route.params.slug)
const n = Number(route.params.n)
const api = useStockApi()

const { data: creation } = await useAsyncData(`stock-${slug}`, () => api.get(slug))
const { data: version } = await useAsyncData(`stock-${slug}-v-${n}`, () => api.getVersion(slug, n))
if (!creation.value || !version.value)
  throw createError({ statusCode: 404 })

const c = computed(() => creation.value!)
const v = computed(() => version.value!)
const latest = computed(() => c.value.latestVersion)
const isOutdated = computed(() => !!latest.value && latest.value.number > v.value.number)
const isUnpublished = computed(() => v.value.status !== 'published')

const KIND_LABELS: Record<StockListItem['kind'], string> = {
  'infobox': 'Info box',
  'custom-bar': 'Custom bar',
  'bundle': 'Bundle',
}
const CATEGORY_LABELS: Record<StockListItem['category'], string> = {
  'combat': 'Combat',
  'party-ui': 'Party UI',
  'raid': 'Raid',
  'lootrun': 'Lootrun',
  'dps-meter': 'DPS meter',
  'cooldown-tracker': 'Cooldowns',
  'resource-tracker': 'Resources',
  'qol': 'QoL',
}

const classDisplay = computed(() => c.value.classes.map(x => x.charAt(0).toUpperCase() + x.slice(1)))

const groups = computed(() => {
  const required = v.value.parts.filter(p => !p.group)
  const grouped = new Map<string, typeof v.value.parts>()
  for (const p of v.value.parts) {
    if (p.group) {
      if (!grouped.has(p.group))
        grouped.set(p.group, [])
      grouped.get(p.group)!.push(p)
    }
  }
  return { required, grouped: [...grouped.entries()] }
})

function partRawUrl(partId: string) {
  return api.rawUrl(slug, v.value.number, partId)
}

function formatDate(iso: string | null) {
  if (!iso)
    return null
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

useHead({ title: `${c.value.title} ${v.value.label}` })
</script>

<template>
  <div class="page">
    <nav class="topbar">
      <NuxtLink :to="`/stock/${slug}`" class="topbar-back">
        ‹ {{ c.title }}
      </NuxtLink>
      <span class="topbar-title">{{ v.label }}</span>
    </nav>

    <div class="layout">
      <aside class="rail">
        <section class="rail-card">
          <header class="rail-author">
            <img
              v-if="c.author.avatar"
              :src="avatarUrl(c.author.discordId, c.author.avatar)"
              class="rail-avatar"
              :alt="c.author.username"
              width="36"
              height="36"
            >
            <span v-else class="rail-avatar rail-avatar--fallback" aria-hidden="true">
              {{ (c.author.displayName ?? c.author.username)[0]?.toUpperCase() }}
            </span>
            <div>
              <p class="rail-by">
                Author
              </p>
              <NuxtLink :to="`/u/${c.author.username}`" class="rail-author-name">
                {{ c.author.displayName ?? c.author.username }}
              </NuxtLink>
            </div>
          </header>

          <dl class="rail-grid">
            <div class="rail-row">
              <dt class="kicker">
                Kind
              </dt>
              <dd>{{ KIND_LABELS[c.kind] }}</dd>
            </div>
            <div class="rail-row">
              <dt class="kicker">
                Category
              </dt>
              <dd>{{ CATEGORY_LABELS[c.category] }}</dd>
            </div>
            <div v-if="classDisplay.length" class="rail-row">
              <dt class="kicker">
                Classes
              </dt>
              <dd class="rail-classes">
                <img
                  v-for="cls in classDisplay"
                  :key="cls"
                  :src="classWeaponUrl(cls)"
                  class="rail-cls"
                  :style="{ '--cls-color': CLASS_THEMES[cls]?.color }"
                  :alt="cls"
                  :title="cls"
                >
              </dd>
            </div>
            <div class="rail-row">
              <dt class="kicker">
                Version
              </dt>
              <dd>{{ v.label }}</dd>
            </div>
            <div v-if="v.publishedAt" class="rail-row">
              <dt class="kicker">
                Published
              </dt>
              <dd class="rail-count">
                {{ formatDate(v.publishedAt) }}
              </dd>
            </div>
          </dl>

          <div class="rail-actions">
            <button
              type="button"
              class="install-cta install-cta--disabled"
              :title="isOutdated ? 'Switch to latest version to install' : 'This version is not publishable'"
              disabled
            >
              Install ⬇
            </button>
            <p class="install-hint">
              <template v-if="isOutdated">
                Historical snapshot — open latest to install.
              </template>
              <template v-else-if="isUnpublished">
                This version is a draft.
              </template>
            </p>
          </div>
        </section>
      </aside>

      <main class="main">
        <div
          class="banner"
          :class="{ 'banner--unpublished': isUnpublished }"
        >
          <span class="banner-kicker">
            <template v-if="isUnpublished">
              Version {{ v.number }} · draft · not published
            </template>
            <template v-else-if="isOutdated">
              Version {{ v.number }}<template v-if="formatDate(v.publishedAt)"> · {{ formatDate(v.publishedAt) }}</template> · viewing historical
            </template>
            <template v-else>
              Version {{ v.number }}<template v-if="formatDate(v.publishedAt)"> · {{ formatDate(v.publishedAt) }}</template> · current
            </template>
          </span>
          <NuxtLink
            v-if="isOutdated"
            :to="`/stock/${slug}`"
            class="banner-link"
          >
            Latest is {{ latest!.label }} →
          </NuxtLink>
        </div>

        <header class="main-head">
          <h1 class="main-title">
            {{ c.title }}
            <span class="main-version">{{ v.label }}</span>
          </h1>
          <p v-if="v.changelog" class="main-changelog">
            {{ v.changelog }}
          </p>
        </header>

        <section class="block">
          <h2 class="kicker block-head">
            Parts
          </h2>
          <div v-if="v.parts.length" class="parts">
            <StockPartView
              v-for="p in groups.required"
              :key="p.id"
              :part="p"
              :raw-url="partRawUrl(p.id)"
            />
            <div v-for="[g, ps] in groups.grouped" :key="g" class="pickone">
              <p class="kicker pickone-rule">
                Pick one · {{ g }}
              </p>
              <StockPartView
                v-for="p in ps"
                :key="p.id"
                :part="p"
                :raw-url="partRawUrl(p.id)"
              />
            </div>
          </div>
          <p v-else class="state">
            This version has no parts.
          </p>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 0 64px;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}
.topbar-back {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.12s ease-out;
}
.topbar-back:hover {
  color: var(--color-accent);
}
.topbar-title {
  font: 500 12px/1 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--color-text);
}

.layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

.rail {
  position: sticky;
  top: 88px;
}

.rail-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.rail-author {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rail-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.rail-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-hi);
  color: var(--color-muted);
  font: 600 13px/1 var(--font-mono);
  letter-spacing: 0.04em;
}
.rail-by {
  margin: 0;
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.rail-author-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.12s ease-out;
}
.rail-author-name:hover {
  color: var(--color-accent);
}

.rail-grid {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}
.rail-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.rail-row dt {
  margin: 0;
}
.rail-row dd {
  margin: 0;
  font-size: 13px;
  color: var(--color-text);
  text-align: right;
}
.rail-classes {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.rail-cls {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  object-fit: contain;
}
.rail-count {
  font: 500 12px/1 var(--font-mono);
  letter-spacing: 0.06em;
}

.rail-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.install-cta {
  font: 600 12px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 6px;
  padding: 11px 14px;
}
.install-cta--disabled {
  color: var(--color-faint);
  background: transparent;
  border: 1px dashed var(--color-border);
  cursor: not-allowed;
}
.install-hint {
  margin: 0;
  font-size: 11px;
  color: var(--color-faint);
}

.main {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-accent) 30%, transparent);
  border-radius: 8px;
}
.banner--unpublished {
  background: color-mix(in oklch, var(--color-surface) 60%, transparent);
  border-color: var(--color-border);
}
.banner-kicker {
  flex: 1;
  font: 500 11px/1.3 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}
.banner-link {
  flex-shrink: 0;
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  text-decoration: none;
  transition: opacity 0.12s ease-out;
}
.banner-link:hover {
  opacity: 0.8;
}

.main-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.main-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--color-text);
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}
.main-version {
  font: 500 13px/1 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--color-muted);
}
.main-changelog {
  margin: 0;
  max-width: 65ch;
  color: var(--color-muted);
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.55;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.block-head {
  margin: 0;
}
.parts {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pickone {
  background: color-mix(in oklch, var(--color-surface) 60%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pickone-rule {
  margin: 0;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .rail {
    position: static;
  }
}
@media (max-width: 720px) {
  .page {
    padding: 12px 0 48px;
  }
  .main-title {
    font-size: 26px;
  }
}
</style>
