<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { TIER_COLORS } from '~/lib/items/tooltip'
import { puzzleNumberFor } from '~/lib/wynndle/anchor'

definePageMeta({
  layout: 'play',
  pageTransition: { name: 'play-fade', mode: 'out-in' },
})

const route = useRoute()
const param = computed(() => {
  const raw = (route.params as Record<string, string | string[]>)['date-mode']
  return Array.isArray(raw) ? raw[0] : (raw ?? '')
})
const m = computed(() => param.value.match(/^(\d{4}-\d{2}-\d{2})-(weapon|armor)$/))
if (!m.value)
  throw createError({ statusCode: 404, statusMessage: 'Not found' })

const date = computed(() => m.value![1]!)
const mode = computed(() => m.value![2]!)
const data = ref<{ date: string, answer: { name?: string, rarity?: string } | null, gameVersion: string } | null>(null)
const errMsg = ref<string | null>(null)

onMounted(async () => {
  const base = useRuntimeConfig().public.apiBaseUrl as string
  const res = await fetch(`${base}/v1/wynndle/archive/${date.value}?mode=${mode.value}`, { credentials: 'include' })
  if (res.ok) {
    data.value = await res.json()
  }
  else {
    const body = await res.json().catch(() => ({} as { error?: string }))
    errMsg.value = body.error === 'not yet' ? 'This puzzle is not yet available.' : 'Could not load this puzzle.'
  }
})

const dayNumber = puzzleNumberFor

function rarityColor(rarity?: string) {
  if (!rarity)
    return TIER_COLORS.Normal
  const key = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase()
  return TIER_COLORS[key] ?? TIER_COLORS.Normal
}

useSeoMeta({ title: () => data.value ? `${date.value} — ${data.value.answer?.name ?? '?'} · Wynndle` : 'Wynndle archive · wynn.tools' })
</script>

<template>
  <section class="archive-detail">
    <NuxtLink to="/play/wynndle/archive" class="back-pill">
      <ArrowLeft :size="14" :stroke-width="2.5" />
      <span>Archive</span>
    </NuxtLink>

    <div class="detail-frame">
      <template v-if="data">
        <header class="detail-head">
          <span class="detail-kicker">
            ARCHIVE · DAY {{ dayNumber(date) }} · {{ mode.toUpperCase() }}
          </span>
          <time class="detail-date">{{ date }}</time>
        </header>

        <div class="detail-answer">
          <p class="detail-label">
            The item was
          </p>
          <span class="detail-name" :style="{ color: rarityColor(data.answer?.rarity) }">
            {{ data.answer?.name ?? 'Unknown' }}
          </span>
        </div>
      </template>
      <p v-else-if="errMsg" class="detail-error">
        {{ errMsg }}
      </p>
      <p v-else class="detail-loading">
        Loading…
      </p>
    </div>
  </section>
</template>

<style scoped>
.archive-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 0 64px;
  display: grid;
  gap: 18px;
}

.back-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--paper-light);
  border: 2px solid var(--paper-bd);
  color: var(--paper-text-strong);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
  width: max-content;
  transition: background-color 0.12s ease-out;
}

.back-pill:hover {
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
}

.back-pill:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.detail-frame {
  background: var(--paper-base);
  padding: 32px 28px;
  box-shadow: var(--wood-shadow-medium);
  display: grid;
  gap: 18px;
}

.detail-head {
  display: grid;
  gap: 4px;
  text-align: center;
}

.detail-kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--paper-text);
}

.detail-date {
  font-family: var(--font-mono);
  font-size: 16px;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
  color: var(--paper-text-strong);
}

.detail-answer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  background: var(--paper-dark);
  border: 2px solid var(--paper-bd);
  box-shadow:
    inset 0 1px 0 rgb(0 0 0 / 0.18),
    inset 0 -1px 0 var(--paper-bd-light);
}

.detail-label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--paper-text);
  opacity: 0.78;
}

.detail-name {
  font-family: var(--font-display);
  font-size: clamp(28px, 4.5vw, 44px);
  line-height: 1;
  letter-spacing: -0.01em;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.5);
  text-align: center;
}

.detail-error,
.detail-loading {
  margin: 0;
  padding: 18px;
  text-align: center;
  font-family: var(--font-body);
  color: var(--paper-text);
}

@media (max-width: 720px) {
  .archive-detail {
    padding: 14px 0 96px;
  }

  .detail-frame {
    padding: 20px 14px;
  }
}
</style>
