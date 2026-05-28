<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { AtreeNode, NormalizedText } from '~/lib/types/atree'
import { computed } from 'vue'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const FONT_FAMILY: Record<string, string> = {
  ascii: '\'wynn-ascii\'',
  common: '\'wynn-common\'',
  default: '\'wynn-default\'',
  five: '\'wynn-five\'',
  wynnic: '\'wynn-wynnic\'',
  high_gavelian: '\'wynn-high-gavelian\'',
  old_fruman: '\'wynn-old-fruman\'',
}

function segmentStyle(seg: NormalizedText): CSSProperties {
  return {
    color: seg.color,
    fontFamily: seg.font ? FONT_FAMILY[seg.font] : undefined,
    fontWeight: seg.bold ? 700 : undefined,
    fontStyle: seg.italic ? 'italic' : undefined,
    textDecoration: seg.underline ? 'underline' : undefined,
  }
}

const activeAbilities = computed<AtreeNode[]>(() =>
  store.atreeNodes.filter(n => store.isAtreeActive(n.ability.id)),
)
</script>

<template>
  <aside class="active-panel">
    <header class="head">
      <span class="kicker">Active Abilities</span>
      <span class="count mono">{{ activeAbilities.length }}</span>
    </header>

    <div v-if="!activeAbilities.length" class="empty">
      Pick abilities in the tree.
    </div>

    <ol v-else class="list">
      <li v-for="node in activeAbilities" :key="node.ability.id" class="item">
        <header class="item-head">
          <h4 class="item-title">
            {{ node.ability.display_name }}
          </h4>
          <span class="item-cost mono">{{ node.ability.cost }} AP</span>
        </header>
        <p
          v-if="node.ability.desc && node.ability.desc.length"
          class="item-desc"
        >
          <template v-if="typeof node.ability.desc === 'string'">
            {{ node.ability.desc }}
          </template>
          <template v-else>
            <span
              v-for="(seg, i) in node.ability.desc"
              :key="i"
              :style="segmentStyle(seg)"
            >{{ seg.text }}</span>
          </template>
        </p>
      </li>
    </ol>
  </aside>
</template>

<style scoped>
.active-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-height: 60vh;
  overflow-y: auto;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  background: var(--color-surface);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.count {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-copper);
  font-weight: 600;
}

.empty {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-faint);
  letter-spacing: 0.04em;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}
.item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.item-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.item-title {
  font-family: 'Barlow Semi Condensed', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--color-text);
  margin: 0;
}

.item-cost {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-copper);
  font-weight: 600;
}

.item-desc {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--color-muted);
  white-space: pre-line;
  margin: 0;
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}

@media (max-width: 720px) {
  .active-panel {
    max-height: 48vh;
    padding: 12px 14px;
    gap: 10px;
  }
  .list {
    gap: 12px;
  }
  .item-title {
    font-size: 13px;
  }
}
</style>
