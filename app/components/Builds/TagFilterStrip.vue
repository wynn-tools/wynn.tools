<script setup lang="ts">
import type { TagAxis } from '~/lib/build-tags'
import { computed, ref } from 'vue'
import { BUILD_TAGS } from '~/lib/build-tags'

const props = defineProps<{ active: readonly string[] }>()
const emit = defineEmits<{ change: [tags: string[]] }>()

const customInput = ref('')

const grouped = computed(() => {
  const out: Record<TagAxis, Array<{ slug: string, label: string }>> = {
    role: [],
    playstyle: [],
    content: [],
    budget: [],
    misc: [],
  }
  for (const [slug, def] of Object.entries(BUILD_TAGS))
    out[def.axis].push({ slug, label: def.label })
  return out
})

const AXIS_ORDER: TagAxis[] = ['role', 'playstyle', 'content', 'budget', 'misc']
const AXIS_LABELS: Record<TagAxis, string> = { role: 'Role', playstyle: 'Playstyle', content: 'Content', budget: 'Budget', misc: 'Misc' }

function toggle(slug: string) {
  if (props.active.includes(slug))
    emit('change', props.active.filter(t => t !== slug))
  else
    emit('change', [...props.active, slug])
}

function addCustom() {
  const v = customInput.value.trim().toLowerCase().replace(/\s+/g, '-')
  if (!v || props.active.includes(v))
    return
  emit('change', [...props.active, v])
  customInput.value = ''
}

function clear() {
  emit('change', [])
}
</script>

<template>
  <div class="tag-filter-strip">
    <div v-for="axis in AXIS_ORDER" :key="axis" class="strip-group">
      <p class="strip-axis">
        {{ AXIS_LABELS[axis] }}
      </p>
      <div class="strip-chips">
        <button
          v-for="opt in grouped[axis]"
          :key="opt.slug"
          type="button"
          class="strip-chip"
          :class="{ on: active.includes(opt.slug) }"
          @click="toggle(opt.slug)"
        >
          {{ opt.label }}
          <span v-if="active.includes(opt.slug)" class="x" aria-hidden="true">×</span>
        </button>
      </div>
    </div>
    <div class="strip-custom">
      <input
        v-model="customInput"
        type="text"
        class="strip-input"
        placeholder="Tag contains…"
        @keydown.enter.prevent="addCustom"
      >
      <button type="button" class="strip-add" @click="addCustom">
        Add
      </button>
    </div>
    <button v-if="active.length > 0" type="button" class="strip-clear" @click="clear">
      Clear all
    </button>
  </div>
</template>

<style scoped>
.tag-filter-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.strip-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.strip-axis {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
}
.strip-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.strip-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
}
.strip-chip:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}
.strip-chip.on {
  background: var(--color-accent);
  color: oklch(15% 0.01 265);
  border-color: var(--color-accent);
}
.x {
  font-size: 12px;
}
.strip-custom {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.strip-input {
  flex: 1;
  font-size: 11px;
  padding: 4px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
}
.strip-add {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 4px;
  cursor: pointer;
}
.strip-clear {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--color-faint);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
}
.strip-clear:hover {
  color: var(--color-text);
}
</style>
