<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref } from 'vue'
import { BUILD_TAGS, DENY_TAGS, normalizeTags, TAG_LIMITS, tagAxis, tagDisplayLabel } from '~/lib/build-tags'

const props = defineProps<{ tags: readonly string[] }>()
const emit = defineEmits<{ change: [tags: string[]] }>()

const query = ref('')
const open = ref(false)

const grouped = computed(() => {
  const groups: Record<string, Array<{ slug: string, label: string }>> = {
    role: [],
    playstyle: [],
    content: [],
    budget: [],
    misc: [],
  }
  const q = query.value.trim().toLowerCase()
  for (const [slug, def] of Object.entries(BUILD_TAGS)) {
    if (props.tags.includes(slug))
      continue
    if (q && !slug.toLowerCase().includes(q) && !def.label.toLowerCase().includes(q))
      continue
    groups[def.axis].push({ slug, label: def.label })
  }
  return groups
})

const queryIsDenied = computed(() => {
  const q = query.value.trim().toLowerCase().replace(/\s+/g, '-')
  return DENY_TAGS.has(q)
})

const atCap = computed(() => props.tags.length >= TAG_LIMITS.MAX_PER_BUILD)

function addTag(slug: string) {
  if (atCap.value)
    return
  const next = normalizeTags([...props.tags, slug])
  emit('change', next)
  query.value = ''
}

function addCustom() {
  if (atCap.value)
    return
  const q = query.value.trim()
  if (!q)
    return
  const next = normalizeTags([...props.tags, q])
  emit('change', next)
  query.value = ''
}

function removeTag(slug: string) {
  emit('change', props.tags.filter(t => t !== slug))
}

const AXIS_ORDER: Array<keyof typeof grouped.value> = ['role', 'playstyle', 'content', 'budget', 'misc']
const AXIS_LABELS: Record<string, string> = { role: 'Role', playstyle: 'Playstyle', content: 'Content', budget: 'Budget', misc: 'Misc' }
</script>

<template>
  <span class="tag-picker">
    <span v-for="t in tags" :key="t" class="tag-chip" :data-axis="tagAxis(t) ?? 'custom'">
      {{ tagDisplayLabel(t) }}
      <button type="button" class="chip-remove" :aria-label="`Remove ${t}`" @click="removeTag(t)">×</button>
    </span>
    <PopoverRoot v-model:open="open">
      <PopoverTrigger as-child>
        <button type="button" class="tag-chip add-tag" :disabled="atCap">+ Add tag</button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent class="picker-pop" :side-offset="6">
          <input v-model="query" type="text" class="picker-input" placeholder="Search tags…" autofocus>
          <p v-if="atCap" class="picker-hint">Max {{ TAG_LIMITS.MAX_PER_BUILD }} tags — remove one to add more.</p>
          <p v-else-if="queryIsDenied" class="picker-warn">Class is auto-tagged from the build.</p>
          <div v-for="axis in AXIS_ORDER" :key="axis" class="picker-group">
            <p v-if="grouped[axis].length > 0" class="picker-axis">{{ AXIS_LABELS[axis] }}</p>
            <div class="picker-options">
              <button
                v-for="opt in grouped[axis]"
                :key="opt.slug"
                type="button"
                class="picker-opt"
                :disabled="atCap"
                @click="addTag(opt.slug)"
              >{{ opt.label }}</button>
            </div>
          </div>
          <button
            v-if="query.trim() && !queryIsDenied && !atCap"
            type="button"
            class="picker-custom"
            @click="addCustom"
          >+ Add custom "{{ query.trim() }}"</button>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </span>
</template>

<style scoped>
.tag-picker {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
.chip-remove {
  background: none;
  border: none;
  color: var(--color-faint);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}
.add-tag {
  background: transparent;
  cursor: pointer;
  color: var(--color-faint);
}
.add-tag:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.picker-pop {
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
  z-index: 50;
}
.picker-input {
  width: 100%;
  padding: 6px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  margin-bottom: 8px;
}
.picker-axis {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin: 6px 0 4px 0;
}
.picker-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.picker-opt {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}
.picker-opt:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.picker-opt:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.picker-hint,
.picker-warn {
  font-size: 11px;
  color: var(--color-muted);
  margin: 4px 0;
}
.picker-warn {
  color: oklch(70% 0.15 35);
}
.picker-custom {
  margin-top: 8px;
  display: block;
  width: 100%;
  padding: 6px;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  font-size: 12px;
}
</style>
