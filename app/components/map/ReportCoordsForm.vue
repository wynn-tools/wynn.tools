<script setup lang="ts">
import type { FeatureDetail } from '~/composables/useFeatureDetails'
import { computed, reactive, ref } from 'vue'

const props = defineProps<{ detail: FeatureDetail }>()
const emit = defineEmits<{ close: [], submitted: [] }>()

const coords = reactive({
  x: props.detail.location.x,
  y: props.detail.location.y,
  z: props.detail.location.z,
})
const description = ref('')
const ign = ref('')
const opening = ref(false)

const unchanged = computed(
  () =>
    coords.x === props.detail.location.x
    && coords.y === props.detail.location.y
    && coords.z === props.detail.location.z,
)

function sourceFile(categoryId: string): string {
  if (categoryId === 'wynntils:content:cave')
    return 'Reference/caves.json'
  if (categoryId.startsWith('wynntils:content:'))
    return 'Data-Storage/combat_locations.json'
  if (categoryId.startsWith('wynntils:service:'))
    return 'Data-Storage/services_crowdsourced.json'
  return 'Reference/place_mapfeatures.json'
}

function submit() {
  if (unchanged.value)
    return

  const { label, categoryId, location } = props.detail
  const file = sourceFile(categoryId)

  const title = encodeURIComponent(`Incorrect coords: ${label}`)
  const body = encodeURIComponent(
    [
      `**Marker:** ${label} (${categoryId})`,
      `**Source file:** ${file}`,
      `**Current coords:** X ${location.x}, Y ${location.y}, Z ${location.z}`,
      `**Suggested coords:** X ${coords.x}, Y ${coords.y}, Z ${coords.z}`,
      `**Notes:** ${description.value.trim() || 'None'}`,
      `**Reported by:** ${ign.value.trim() || 'Anonymous'}`,
      '',
      '---',
      '*Reported via the Wynntils web map*',
    ].join('\n'),
  )

  const url = `https://github.com/Wynntils/Static-Storage/issues/new?title=${title}&body=${body}`
  window.open(url, '_blank', 'noopener')

  opening.value = true
  setTimeout(() => {
    opening.value = false
    emit('submitted')
  }, 600)
}
</script>

<template>
  <div class="mt-3 border-t border-copper/10 pt-3">
    <header class="mb-3 flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wider text-muted">
        Suggest a correction
      </span>
      <button
        type="button"
        class="rounded p-0.5 text-muted hover:text-copper"
        aria-label="Cancel report"
        @click="emit('close')"
      >
        ✕
      </button>
    </header>

    <div class="mb-3 flex gap-2">
      <label v-for="axis in ['x', 'y', 'z'] as const" :key="axis" class="flex-1">
        <span class="mb-1 block text-[10px] uppercase tracking-wider text-muted">
          {{ axis.toUpperCase() }}
        </span>
        <input
          v-model.number="coords[axis]"
          type="number"
          step="1"
          class="w-full rounded bg-bg px-2 py-1.5 text-xs text-text ring-1 ring-copper/20 focus:outline-none focus:ring-copper/60"
        >
      </label>
    </div>

    <label class="mb-2 block">
      <span class="mb-1 block text-[10px] uppercase tracking-wider text-muted">
        What's wrong? <span class="normal-case">(optional)</span>
      </span>
      <input
        v-model="description"
        type="text"
        placeholder="e.g. Entrance is actually 80 blocks further south"
        class="w-full rounded bg-bg px-2 py-1.5 text-xs text-text ring-1 ring-copper/20 placeholder:text-muted/50 focus:outline-none focus:ring-copper/60"
      >
    </label>

    <label class="mb-3 block">
      <span class="mb-1 block text-[10px] uppercase tracking-wider text-muted">
        Your IGN <span class="normal-case">(optional)</span>
      </span>
      <input
        v-model="ign"
        type="text"
        placeholder="YourUsername"
        class="w-full rounded bg-bg px-2 py-1.5 text-xs text-text ring-1 ring-copper/20 placeholder:text-muted/50 focus:outline-none focus:ring-copper/60"
      >
    </label>

    <p v-if="unchanged" class="mb-2 text-[10px] text-muted">
      Update at least one coordinate to report.
    </p>

    <button
      type="button"
      :disabled="unchanged || opening"
      class="w-full rounded py-1.5 text-xs font-medium transition-colors"
      :class="
        unchanged || opening
          ? 'bg-copper/10 text-muted cursor-not-allowed'
          : 'bg-copper text-bg hover:bg-copper/90'
      "
      @click="submit"
    >
      {{ opening ? 'Opening…' : 'Open GitHub issue' }}
    </button>
  </div>
</template>
