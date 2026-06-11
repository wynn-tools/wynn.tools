<script setup lang="ts">
import type { StockListItem } from '~/lib/types/stock'
import StockMediaGallery from '~/components/stock/StockMediaGallery.vue'
import StockPartView from '~/components/stock/StockPartView.vue'
import StockReactionBar from '~/components/stock/StockReactionBar.vue'
import { CLASS_THEMES, classWeaponUrl } from '~/lib/build/class-theme'
import { useAuthStore } from '~/stores/auth'

function avatarUrl(discordId: string, avatar: string) {
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=64`
}

const route = useRoute()
const api = useStockApi()
const auth = useAuthStore()

const { data: creation } = await useAsyncData(
  `stock-${route.params.slug}`,
  () => api.get(String(route.params.slug)),
)
if (!creation.value)
  throw createError({ statusCode: 404 })

const c = computed(() => creation.value!)
const counts = ref(c.value.reactionCounts)

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

const parts = computed(() => c.value.latestVersion?.parts ?? [])
const groups = computed(() => {
  const required = parts.value.filter(p => !p.group)
  const grouped = new Map<string, typeof parts.value>()
  for (const p of parts.value) {
    if (p.group) {
      if (!grouped.has(p.group))
        grouped.set(p.group, [])
      grouped.get(p.group)!.push(p)
    }
  }
  return { required, grouped: [...grouped.entries()] }
})

const chosenInGroup = reactive<Record<string, string>>({})
watchEffect(() => {
  for (const [g, ps] of groups.value.grouped) {
    if (!chosenInGroup[g])
      chosenInGroup[g] = ps[0]!.id
  }
})

function partRawUrl(partId: string) {
  return api.rawUrl(c.value.slug, c.value.latestVersion!.number, partId)
}

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function installAll() {
  const chosen = parts.value.filter(p => !p.group || chosenInGroup[p.group] === p.id)
  const text = chosen
    .filter(p => p.role !== 'resourcepack')
    .map(p => `### ${p.name}\n\`\`\`\n${p.textContent}\n\`\`\``)
    .join('\n\n')
  await navigator.clipboard.writeText(text)
  copied.value = true
  if (copyTimer)
    clearTimeout(copyTimer)
  copyTimer = setTimeout(() => copied.value = false, 1500)
}

const isOwner = computed(() => !!auth.user && auth.user.id === c.value.author.id)
const classDisplay = computed(() => c.value.classes.map(x => x.charAt(0).toUpperCase() + x.slice(1)))

useHead({
  title: c.value.title,
  meta: [
    { property: 'og:title', content: c.value.title },
    { property: 'og:description', content: c.value.description },
    {
      property: 'og:image',
      content: `${useRuntimeConfig().public.apiBaseUrl}/v1/og/stock/${c.value.slug}`,
    },
  ],
})

onBeforeUnmount(() => {
  if (copyTimer)
    clearTimeout(copyTimer)
})
</script>

<template>
  <div class="page">
    <nav class="topbar">
      <NuxtLink to="/stock" class="topbar-back">
        ‹ All stock
      </NuxtLink>
      <span class="topbar-title">{{ c.title }}</span>
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
            <div v-if="c.latestVersion" class="rail-row">
              <dt class="kicker">
                Version
              </dt>
              <dd>
                <NuxtLink :to="`/stock/${c.slug}/v/${c.latestVersion.number}`" class="rail-version">
                  {{ c.latestVersion.label }}
                </NuxtLink>
              </dd>
            </div>
            <div class="rail-row">
              <dt class="kicker">
                Installed
              </dt>
              <dd class="rail-count">
                {{ c.installCount.toLocaleString() }}×
              </dd>
            </div>
            <div class="rail-row">
              <dt class="kicker">
                Reactions
              </dt>
              <dd class="rail-count">
                ★ {{ counts.thumbs_up + counts.fire + counts.art + counts.bug }}
              </dd>
            </div>
          </dl>

          <div v-if="parts.length" class="rail-actions">
            <button
              type="button"
              class="install-cta"
              :class="{ 'install-cta--copied': copied }"
              @click="installAll"
            >
              {{ copied ? 'Copied ✓' : 'Install ⬇' }}
            </button>
            <p class="install-hint">
              Copies all required parts as markdown.
            </p>
          </div>

          <div v-if="isOwner" class="rail-owner">
            <span class="kicker">Owner</span>
            <NuxtLink :to="`/stock/${c.slug}/edit`" class="rail-chip">
              Edit
            </NuxtLink>
          </div>
        </section>
      </aside>

      <main class="main">
        <header class="main-head">
          <h1 class="main-title">
            {{ c.title }}
          </h1>
          <p v-if="c.description" class="main-desc">
            {{ c.description }}
          </p>
        </header>

        <section v-if="c.media.length" class="block">
          <StockMediaGallery :media="c.media" />
        </section>

        <section v-if="parts.length" class="block">
          <h2 class="kicker block-head">
            Install
          </h2>
          <div class="parts">
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
              <UiSegmented
                v-model="chosenInGroup[g]"
                :options="ps.map(p => ({ value: p.id, label: p.name }))"
                role="radio"
                :aria-label="`Pick one for ${g}`"
              />
              <StockPartView
                v-for="p in ps.filter(pp => chosenInGroup[g] === pp.id)"
                :key="p.id"
                :part="p"
                :raw-url="partRawUrl(p.id)"
              />
            </div>
          </div>
        </section>
        <section v-else class="block">
          <h2 class="kicker block-head">
            Install
          </h2>
          <p class="state">
            No installable parts yet. The author may still be drafting.
          </p>
        </section>

        <section class="block">
          <h2 class="kicker block-head">
            Reactions
          </h2>
          <StockReactionBar
            :slug="c.slug"
            :counts="counts"
            @updated="counts = $event"
          />
        </section>

        <section v-if="c.creditsNote" class="block">
          <h2 class="kicker block-head">
            Credits
          </h2>
          <p class="credits">
            {{ c.creditsNote }}
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
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.rail-version {
  font: 500 12px/1 var(--font-mono);
  letter-spacing: 0.06em;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.12s ease-out;
}
.rail-version:hover {
  color: var(--color-accent);
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
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  padding: 11px 14px;
  cursor: pointer;
  transition:
    background 0.12s ease-out,
    color 0.12s ease-out;
}
.install-cta:hover {
  background: color-mix(in oklch, var(--color-accent) 18%, transparent);
}
.install-cta:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.install-cta--copied {
  background: color-mix(in oklch, var(--color-accent) 20%, transparent);
  pointer-events: none;
}

.install-hint {
  margin: 0;
  font-size: 11px;
  color: var(--color-faint);
}

.rail-owner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}
.rail-chip {
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 12px;
  text-decoration: none;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}
.rail-chip:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.main {
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-width: 0;
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
}
.main-desc {
  margin: 0;
  max-width: 65ch;
  color: var(--color-text);
  white-space: pre-wrap;
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

.credits {
  max-width: 65ch;
  white-space: pre-wrap;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.55;
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
  .topbar {
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .main-title {
    font-size: 26px;
  }
  .main {
    gap: 24px;
  }
}
</style>
