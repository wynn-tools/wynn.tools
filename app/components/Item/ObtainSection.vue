<script setup lang="ts">
import type { ObtainKind } from '~/lib/items-search/obtain'
import type { SearchItem } from '~/lib/items-search/types'
import { useItemSources } from '~/composables/useItemSources'
import { useWorldEventLoot } from '~/composables/useWorldEvents'
import { mobsForItem } from '~/lib/item-sources/lookup'
import { obtainInfo } from '~/lib/items-search/obtain'
import { worldEventDropsForItem } from '~/lib/world-events/item-drops'

const props = defineProps<{ item: SearchItem }>()
const baseMethods = computed(() => obtainInfo(props.item))

const { loot } = useWorldEventLoot()
const worldEventDrops = computed(() => worldEventDropsForItem(props.item.name, loot.value))

const { sources } = useItemSources()
const wikiMobs = computed(() => mobsForItem(props.item.name, sources.value))

const hasWorldEvent = computed(() => worldEventDrops.value.length > 0)
const hasWikiMobs = computed(() => wikiMobs.value.length > 0)
const methods = computed(() => {
  let m = baseMethods.value
  if (hasWorldEvent.value || hasWikiMobs.value)
    m = m.filter(x => x.kind !== 'unknown')
  if (hasWikiMobs.value)
    m = m.filter(x => x.kind !== 'mobs')
  return m
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
</script>

<template>
  <section class="obtain">
    <header class="head">
      <h2 class="kicker">
        Acquisition
      </h2>
    </header>
    <ul class="methods">
      <li v-for="m in methods" :key="m.kind" class="method" :class="[`method--${m.kind}`]">
        <span class="glyph" aria-hidden="true">{{ KIND_GLYPH[m.kind] }}</span>
        <div class="body">
          <span class="tag">{{ KIND_TAG[m.kind] }}</span>
          <span class="desc">{{ m.description }}</span>
          <span v-if="m.quest" class="quest">{{ m.quest }}</span>
        </div>
      </li>
      <li
        v-for="d in wikiMobs"
        :key="`wiki-${d.mob}`"
        class="method method--mobs"
      >
        <span class="glyph" aria-hidden="true">⚔</span>
        <div class="body">
          <span class="tag">{{ d.kind === 'guaranteed' ? 'Guaranteed drop' : 'Mob drop' }}</span>
          <a class="mob-link" :href="d.wiki" target="_blank" rel="noopener">{{ d.mob }}</a>
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
.method--unknown {
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
.desc {
  font-size: 13.5px;
  color: var(--color-text);
  line-height: 1.4;
}
.quest {
  font: 600 13px/1.3 var(--font-body);
  color: var(--color-gold);
  margin-top: 1px;
}
.event-link,
.mob-link {
  font: 600 13.5px/1.3 var(--font-body);
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.12s ease-out;
}
.event-link:hover,
.mob-link:hover {
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
  .desc {
    font-size: 13px;
  }
}
</style>
