<script setup lang="ts">
import type { SourceEntry, SourceType } from '~/lib/item-sources/types'
import type { ObtainKind } from '~/lib/items-search/obtain'
import type { SearchItem } from '~/lib/items-search/types'
import { useItemSources } from '~/composables/useItemSources'
import { useWorldEventLoot } from '~/composables/useWorldEvents'
import { sourcesForItem } from '~/lib/item-sources/lookup'
import { obtainInfo } from '~/lib/items-search/obtain'
import { worldEventDropsForItem } from '~/lib/world-events/item-drops'

const props = defineProps<{ item: SearchItem }>()

const { loot } = useWorldEventLoot()
const worldEventDrops = computed(() => worldEventDropsForItem(props.item.name, loot.value))
const hasWorldEvent = computed(() => worldEventDrops.value.length > 0)

const { sources } = useItemSources()
const wikiSources = computed(() => sourcesForItem(props.item.name, sources.value))
const wikiSourcesVisible = computed(() =>
  hasWorldEvent.value
    ? wikiSources.value.filter(e => e.type !== 'worldEvent')
    : wikiSources.value,
)
const hasWikiSources = computed(() => wikiSources.value.length > 0)

const fallbackMethods = computed(() => {
  if (hasWikiSources.value || hasWorldEvent.value)
    return []
  return obtainInfo(props.item)
})

const KIND_GLYPH: Record<ObtainKind, string> = {
  mobs: '⚔',
  lootchest: '◆',
  anyLootchest: '◇',
  quest: '✦',
  unknown: '?',
}
const KIND_TAG: Record<ObtainKind, string> = {
  mobs: 'Mob drop',
  lootchest: 'Tier III–IV',
  anyLootchest: 'Loot chest',
  quest: 'Quest reward',
  unknown: 'Unknown',
}

const SOURCE_TAG: Record<'exclusiveItems' | 'rareRandomLoots', string> = {
  exclusiveItems: 'Exclusive drop',
  rareRandomLoots: 'Rare random loot',
}

const TYPE_GLYPH: Record<SourceType, string> = {
  specificMobDrop: '⚔',
  normalMobDrop: '⚔',
  miniboss: '☠',
  mobDropRegion: '⚔',
  merchant: '⛁',
  dungeonMerchant: '⛁',
  quest: '✦',
  worldEvent: '✺',
  raid: '✦',
  dungeon: '◈',
  caveCompletion: '◉',
  tinkering: '⚙',
  forgeryChest: '◆',
  lootChest: '◇',
  gathering: '✿',
  discovery: '✧',
  environment: '❉',
  event: '✺',
  interaction: '✦',
  unavailable: '∅',
}
const TYPE_TAG: Record<SourceType, string> = {
  specificMobDrop: 'Mob drop',
  normalMobDrop: 'Mob drop',
  miniboss: 'Miniboss',
  mobDropRegion: 'Region drop',
  merchant: 'Merchant',
  dungeonMerchant: 'Dungeon merchant',
  quest: 'Quest reward',
  worldEvent: 'World event',
  raid: 'Raid reward',
  dungeon: 'Dungeon reward',
  caveCompletion: 'Cave completion',
  tinkering: 'Tinkering',
  forgeryChest: 'Forgery chest',
  lootChest: 'Loot chest',
  gathering: 'Gathering',
  discovery: 'Discovery',
  environment: 'Environment',
  event: 'Seasonal event',
  interaction: 'NPC interaction',
  unavailable: 'Unavailable',
}

function entryKey(e: SourceEntry, i: number): string {
  return `${e.type}:${e.name ?? ''}:${i}`
}

function compactNum(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 10_000)
    return `${Math.round(n / 1000)}k`
  return n.toLocaleString()
}

function tradeSummary(entry: SourceEntry): string | null {
  if (!entry.trades || entry.trades.length === 0)
    return null
  const parts: string[] = []
  for (const t of entry.trades) {
    const cost = t.inputs.map(i => `${i.amount} ${i.item}`).join(' + ')
    parts.push(t.inputs.length > 0 ? `${cost} @ ${t.merchant}` : t.merchant)
  }
  return parts.join(' • ')
}

function metaLine(entry: SourceEntry): string | null {
  const bits: string[] = []
  if (entry.level !== undefined)
    bits.push(`Lv ${entry.level}`)
  if (entry.combatLevel !== undefined && entry.combatLevel !== entry.level)
    bits.push(`CL ${entry.combatLevel}`)
  if (entry.health !== undefined)
    bits.push(`${compactNum(entry.health)} HP`)
  if (entry.npc)
    bits.push(entry.npc)
  if (entry.province)
    bits.push(entry.province)
  if (entry.length && entry.difficulty)
    bits.push(`${entry.length} • ${entry.difficulty}`)
  else if (entry.length)
    bits.push(entry.length)
  else if (entry.difficulty)
    bits.push(entry.difficulty)
  return bits.length > 0 ? bits.join(' • ') : null
}
</script>

<template>
  <section class="obtain">
    <header class="head">
      <h2 class="kicker">
        Acquisition
      </h2>
    </header>
    <ul class="methods">
      <li
        v-for="(e, i) in wikiSourcesVisible"
        :key="`src-${entryKey(e, i)}`"
        class="method"
        :class="[`method--${e.type}`]"
      >
        <span class="glyph" aria-hidden="true">{{ TYPE_GLYPH[e.type] }}</span>
        <div class="body">
          <span class="tag">{{ TYPE_TAG[e.type] }}</span>
          <component
            :is="e.wiki ? 'a' : 'span'"
            :href="e.wiki"
            :target="e.wiki ? '_blank' : undefined"
            :rel="e.wiki ? 'noopener' : undefined"
            class="primary"
            :class="{ 'primary-link': !!e.wiki }"
          >
            {{ e.name ?? TYPE_TAG[e.type] }}
          </component>
          <span v-if="e.location" class="desc">{{ e.location }}</span>
          <span v-if="metaLine(e)" class="meta">{{ metaLine(e) }}</span>
          <span v-if="tradeSummary(e)" class="trade">{{ tradeSummary(e) }}</span>
          <span v-if="e.experience || e.emeralds" class="reward">
            <template v-if="e.experience">{{ e.experience }} XP</template>
            <template v-if="e.experience && e.emeralds"> • </template>
            <template v-if="e.emeralds">{{ e.emeralds }}</template>
          </span>
        </div>
      </li>
      <li
        v-for="d in worldEventDrops"
        :key="`we-${d.slug}-${d.source}`"
        class="method method--worldEvent"
      >
        <span class="glyph" aria-hidden="true">✺</span>
        <div class="body">
          <span class="tag">{{ SOURCE_TAG[d.source] }}</span>
          <NuxtLink :to="`/world-events/${d.slug}`" class="event-link">
            {{ d.event }}
          </NuxtLink>
          <span class="desc">Region: {{ d.region }}</span>
          <span v-if="d.note" class="note">{{ d.note }}</span>
        </div>
      </li>
      <li v-for="m in fallbackMethods" :key="m.kind" class="method" :class="[`method--${m.kind}`]">
        <span class="glyph" aria-hidden="true">{{ KIND_GLYPH[m.kind] }}</span>
        <div class="body">
          <span class="tag">{{ KIND_TAG[m.kind] }}</span>
          <span class="desc">{{ m.description }}</span>
          <span v-if="m.quest" class="quest">{{ m.quest }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.obtain {
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}
.head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.kicker {
  margin: 0;
  line-height: 1;
}
.methods {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.method {
  display: flex;
  gap: 14px;
  padding: 12px 0;
  align-items: center;
  border-top: 1px solid color-mix(in oklch, var(--color-border) 55%, transparent);
}
.method:first-child {
  border-top: 0;
  padding-top: 4px;
}
.method--unknown,
.method--unavailable {
  opacity: 0.65;
}
.glyph {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in oklch, var(--color-border) 35%, transparent);
  color: var(--color-muted);
  font-size: 15px;
  flex-shrink: 0;
}
.body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.tag {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.primary {
  font: 600 13.5px/1.3 var(--font-body);
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.12s ease-out;
}
.primary-link:hover {
  color: var(--color-accent);
}
.desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.4;
}
.meta {
  font: 500 11px/1.3 var(--font-mono);
  color: var(--color-faint);
  font-variant-numeric: tabular-nums;
}
.trade {
  font: 500 12px/1.3 var(--font-mono);
  color: var(--color-text);
}
.reward {
  font: 500 11px/1.3 var(--font-mono);
  color: var(--color-good);
  font-variant-numeric: tabular-nums;
}
.quest {
  font: 600 13px/1.3 var(--font-body);
  color: var(--color-gold);
  margin-top: 1px;
}
.event-link {
  font: 600 13.5px/1.3 var(--font-body);
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.12s ease-out;
}
.event-link:hover {
  color: var(--color-accent);
}
.note {
  font-size: 12px;
  color: var(--color-muted);
  font-style: italic;
}

@media (max-width: 720px) {
  .obtain {
    padding-top: 20px;
  }
  .method {
    padding: 10px 0;
    gap: 12px;
  }
  .glyph {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  .primary {
    font-size: 13px;
  }
}
</style>
