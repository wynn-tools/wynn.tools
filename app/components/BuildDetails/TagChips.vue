<script setup lang="ts">
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from 'reka-ui'
import { computed } from 'vue'
import { tagAxis, tagDisplayLabel } from '~/lib/build-tags'

const props = withDefaults(defineProps<{
  tags: readonly string[]
  max?: number
}>(), { max: 999 })

const visible = computed(() => props.tags.slice(0, props.max))
const overflow = computed(() => props.tags.slice(props.max))
</script>

<template>
  <span v-if="tags.length > 0" class="tag-chips">
    <span v-for="t in visible" :key="t" class="tag-chip" :data-axis="tagAxis(t) ?? 'custom'">
      {{ tagDisplayLabel(t) }}
    </span>
    <HoverCardRoot v-if="overflow.length > 0" :open-delay="80" :close-delay="0">
      <HoverCardTrigger as-child>
        <button type="button" class="tag-chip tag-chip-more">+{{ overflow.length }} more</button>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent class="tag-overflow-pop" :side-offset="6">
          <span v-for="t in overflow" :key="t" class="tag-chip" :data-axis="tagAxis(t) ?? 'custom'">
            {{ tagDisplayLabel(t) }}
          </span>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCardRoot>
  </span>
</template>

<style scoped>
.tag-chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-muted);
  font-weight: 500;
}
.tag-chip[data-axis='role'] {
  color: var(--color-accent);
  border-color: color-mix(in oklch, var(--color-accent) 40%, var(--color-border));
}
.tag-chip[data-axis='playstyle'] {
  color: var(--color-text);
}
.tag-chip[data-axis='content'] {
  color: var(--color-text);
}
.tag-chip[data-axis='budget'] {
  color: var(--color-faint);
}
.tag-chip[data-axis='misc'] {
  color: var(--color-muted);
  font-style: italic;
}
.tag-chip-more {
  cursor: pointer;
  background: transparent;
}
.tag-overflow-pop {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-width: 320px;
  z-index: 50;
}
</style>
