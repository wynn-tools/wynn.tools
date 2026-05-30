<script setup lang="ts">
import type { ObtainKind } from '~/lib/items-search/obtain'
import type { SearchItem } from '~/lib/items-search/types'
import { obtainInfo } from '~/lib/items-search/obtain'

const props = defineProps<{ item: SearchItem }>()
const methods = computed(() => obtainInfo(props.item))

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
</script>

<template>
  <section class="obtain">
    <header class="head">
      <span class="kicker">Acquisition</span>
      <h2 class="title">
        How to obtain
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
  font-size: 11px;
  line-height: 1;
  color: var(--color-muted);
}
.title {
  font: 700 20px/1.1 var(--font-display, var(--font-body));
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0;
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
  border-color: oklch(62% 0.11 75 / 0.5);
  background: oklch(62% 0.11 75 / 0.06);
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
  color: oklch(78% 0.14 75);
  background: oklch(62% 0.11 75 / 0.12);
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
  color: oklch(78% 0.14 75);
  margin-top: 2px;
}

@media (max-width: 720px) {
  .obtain {
    padding: 14px 14px 16px;
  }
  .title {
    font-size: 18px;
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
