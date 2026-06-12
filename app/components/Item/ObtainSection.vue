<script setup lang="ts">
import type { ObtainKind } from '~/lib/items-search/obtain'
import type { SearchItem } from '~/lib/items-search/types'
import { useWorldEventLoot } from '~/composables/useWorldEvents'
import { obtainInfo } from '~/lib/items-search/obtain'
import { worldEventDropsForItem } from '~/lib/world-events/item-drops'

const props = defineProps<{ item: SearchItem }>()
const baseMethods = computed(() => obtainInfo(props.item))

const { loot } = useWorldEventLoot()
const worldEventDrops = computed(() => worldEventDropsForItem(props.item.name, loot.value))

const hasWorldEvent = computed(() => worldEventDrops.value.length > 0)
const methods = computed(() => {
  if (!hasWorldEvent.value)
    return baseMethods.value
  return baseMethods.value.filter(m => m.kind !== 'unknown')
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
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 18px 20px 20px;
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
  gap: 8px;
}
.method {
  display: flex;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: color-mix(in oklch, var(--color-bg) 50%, transparent);
  align-items: center;
}
.method--quest {
  border-color: color-mix(in oklch, var(--color-gold-dim) 50%, transparent);
  background: color-mix(in oklch, var(--color-gold-dim) 6%, transparent);
}
.method--worldEvent {
  border-color: color-mix(in oklch, var(--color-accent) 40%, var(--color-border));
  background: color-mix(in oklch, var(--color-accent) 5%, transparent);
}
.method--worldEvent .glyph {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 12%, transparent);
}
.event-link {
  font: 600 13px/1.3 var(--font-body);
  color: var(--color-accent);
  text-decoration: none;
  margin-top: 2px;
}
.event-link:hover {
  text-decoration: underline;
}
.note {
  font-size: 12px;
  color: var(--color-muted);
  font-style: italic;
}
.method--unknown {
  opacity: 0.7;
}
.glyph {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-accent);
  font-size: 16px;
  flex-shrink: 0;
}
.method--quest .glyph {
  color: var(--color-gold);
  background: color-mix(in oklch, var(--color-gold-dim) 12%, transparent);
}
.method--unknown .glyph {
  color: var(--color-faint);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.tag {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.desc {
  font-size: 13.5px;
  color: var(--color-text);
  line-height: 1.4;
}
.quest {
  font: 600 13px/1.3 var(--font-body);
  color: var(--color-gold);
  margin-top: 2px;
}

@media (max-width: 720px) {
  .obtain {
    padding: 14px 14px 16px;
  }
  .method {
    padding: 10px 12px;
    gap: 12px;
  }
  .glyph {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  .desc {
    font-size: 13px;
  }
}
</style>
