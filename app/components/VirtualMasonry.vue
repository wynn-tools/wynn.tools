<script setup lang="ts" generic="T">
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/vue-virtual'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  items: readonly T[]
  minColumnWidth?: number
  gap?: number
  estimateSize?: number
  overscan?: number
  getKey?: (item: T, index: number) => string | number
}>(), {
  minColumnWidth: 280,
  gap: 12,
  estimateSize: 220,
  overscan: 6,
})

const rootEl = ref<HTMLDivElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const useWindow = ref(false)
const containerWidth = ref(0)
const scrollMargin = ref(0)

const lanes = computed(() => {
  const w = containerWidth.value
  if (!w)
    return 1
  return Math.max(1, Math.floor((w + props.gap) / (props.minColumnWidth + props.gap)))
})

const columnWidth = computed(() => {
  const w = containerWidth.value
  const n = lanes.value
  if (!w || !n)
    return 0
  return (w - props.gap * (n - 1)) / n
})

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = el?.parentElement ?? null
  while (cur) {
    const s = getComputedStyle(cur)
    if (/auto|scroll/.test(s.overflowY))
      return cur
    cur = cur.parentElement
  }
  return null
}

function recomputeScrollMargin() {
  if (!rootEl.value)
    return
  scrollMargin.value = rootEl.value.getBoundingClientRect().top + window.scrollY
}

let resizeObs: ResizeObserver | null = null

function onWindowResize() {
  containerWidth.value = rootEl.value?.clientWidth ?? 0
  if (useWindow.value)
    recomputeScrollMargin()
}

onMounted(() => {
  resizeObs = new ResizeObserver(() => {
    containerWidth.value = rootEl.value?.clientWidth ?? 0
    if (useWindow.value)
      recomputeScrollMargin()
  })
  if (rootEl.value)
    resizeObs.observe(rootEl.value)
  containerWidth.value = rootEl.value?.clientWidth ?? 0

  const sp = findScrollParent(rootEl.value)
  if (sp) {
    scrollEl.value = sp
    useWindow.value = false
  }
  else {
    useWindow.value = true
    recomputeScrollMargin()
  }
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  resizeObs?.disconnect()
  window.removeEventListener('resize', onWindowResize)
})

const sharedOptions = computed(() => ({
  count: props.items.length,
  estimateSize: () => props.estimateSize,
  overscan: props.overscan,
  lanes: lanes.value,
  gap: props.gap,
  getItemKey: (i: number) => {
    const item = props.items[i] as T
    return props.getKey ? props.getKey(item, i) : i
  },
}))

const elementVirt = useVirtualizer(computed(() => ({
  ...sharedOptions.value,
  getScrollElement: () => scrollEl.value,
})))

const windowVirt = useWindowVirtualizer(computed(() => ({
  ...sharedOptions.value,
  scrollMargin: scrollMargin.value,
})))

const virtualizer = computed(() => (useWindow.value ? windowVirt.value : elementVirt.value))
const totalSize = computed(() => virtualizer.value.getTotalSize())
const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const startOffset = computed(() => (useWindow.value ? scrollMargin.value : 0))

watch(() => props.items, () => {
  if (useWindow.value)
    window.scrollTo({ top: 0 })
  else
    scrollEl.value?.scrollTo({ top: 0 })
})
</script>

<template>
  <div ref="rootEl" class="vmasonry">
    <div class="vmasonry-inner" :style="{ height: `${totalSize}px` }">
      <div
        v-for="v in virtualItems"
        :key="v.key"
        :ref="el => virtualizer.measureElement(el as Element | null)"
        :data-index="v.index"
        class="vmasonry-cell"
        :style="{
          width: `${columnWidth}px`,
          transform: `translate(${(v.lane ?? 0) * (columnWidth + gap)}px, ${v.start - startOffset}px)`,
        }"
      >
        <slot :item="items[v.index]" :index="v.index" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vmasonry {
  position: relative;
  width: 100%;
}
.vmasonry-inner {
  position: relative;
  width: 100%;
}
.vmasonry-cell {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
