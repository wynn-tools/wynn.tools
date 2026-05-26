<script setup lang="ts">
import type { FeatureDetail } from '~/composables/useFeatureDetails'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMapStore } from '~/stores/map'

const props = defineProps<{ detail: FeatureDetail | null }>()
const store = useMapStore()

const reporting = ref(false)

watch(
  () => props.detail?.featureId,
  () => {
    reporting.value = false
  },
)

const wikiUrl = computed(() =>
  props.detail ? `https://wynncraft.wiki.gg/wiki/${encodeURIComponent(props.detail.label)}` : '#',
)

function copyCoords() {
  if (!props.detail)
    return
  const { x, y, z } = props.detail.location
  navigator.clipboard.writeText(`${x}, ${y}, ${z}`)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (reporting.value) {
      reporting.value = false
    }
    else {
      store.setFocus(null)
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="translate-x-full opacity-0 md:translate-x-full md:opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition duration-150"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0 md:translate-x-full md:opacity-0"
  >
    <aside
      v-if="detail"
      class="pointer-events-auto fixed z-[500] bottom-0 inset-x-0 max-h-[70vh] overflow-y-auto rounded-t-2xl md:absolute md:bottom-auto md:inset-x-auto md:right-4 md:top-4 md:w-80 md:rounded-lg bg-bg/95 p-4 shadow-xl ring-1 ring-copper/20 backdrop-blur"
      role="region"
      :aria-label="`Details for ${detail.label}`"
    >
      <header class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-copper">
            {{ detail.label }}
          </h2>
          <div class="text-xs uppercase tracking-wider text-muted">
            {{ detail.categoryId.split(':').slice(1).join(' / ') }}
            <span v-if="detail.level">· Lv {{ detail.level }}</span>
          </div>
        </div>
        <MapCloseBtn aria-label="Close details" @click="store.setFocus(null)" />
      </header>

      <div v-if="detail.specialInfo" class="mb-2 text-xs font-medium text-copper/80">
        {{ detail.specialInfo }}
      </div>

      <p v-if="detail.description" class="mb-3 text-sm text-muted">
        {{ detail.description }}
      </p>

      <div v-if="detail.length || detail.difficulty" class="mb-3 flex gap-3 text-xs text-muted">
        <span v-if="detail.length">Length: <b class="text-copper">{{ detail.length }}</b></span>
        <span v-if="detail.difficulty">Difficulty: <b class="text-copper">{{ detail.difficulty }}</b></span>
      </div>

      <ul v-if="detail.rewards?.length" class="mb-3 list-disc pl-5 text-sm text-muted">
        <li v-for="r in detail.rewards" :key="r">
          {{ r }}
        </li>
      </ul>

      <div class="flex flex-wrap gap-2 border-t border-copper/10 pt-3 text-xs">
        <a
          :href="wikiUrl"
          target="_blank"
          rel="noopener"
          class="rounded bg-copper/10 px-2 py-1 text-copper hover:bg-copper/20"
        >
          Wiki
        </a>
        <button
          type="button"
          class="rounded bg-copper/10 px-2 py-1 text-copper hover:bg-copper/20"
          @click="copyCoords"
        >
          Copy coords
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 transition-colors"
          :class="
            reporting
              ? 'bg-copper/20 text-copper'
              : 'bg-copper/10 text-copper hover:bg-copper/20'
          "
          @click="reporting = !reporting"
        >
          Report coords
        </button>
      </div>

      <MapReportCoordsForm
        v-if="reporting && detail"
        :detail="detail"
        @close="reporting = false"
        @submitted="reporting = false"
      />
    </aside>
  </Transition>
</template>
