<script setup lang="ts">
import type { WynndleMode } from '~/lib/wynndle/types'
import { Search } from '@lucide/vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useMediaQuery } from '~/composables/useMediaQuery'
import { useWynndlePool } from '~/composables/useWynndlePool'
import { itemIconUrl } from '~/lib/items/icon'
import { TIER_COLORS } from '~/lib/items/tooltip'

const props = defineProps<{
  mode: WynndleMode
  gameVersion: string
  disabled?: boolean
  exclude?: string[]
}>()
const emit = defineEmits<{ submit: [id: string] }>()

const { load } = useWynndlePool()
const items = ref<{ id: string, name: string, rarity: string, icon?: unknown }[]>([])

async function reload() {
  items.value = await load(props.mode, props.gameVersion)
}
onMounted(reload)
watch(() => [props.mode, props.gameVersion], reload)

const query = ref('')
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q === '')
    return []
  const ex = new Set(props.exclude ?? [])
  const startsWith: typeof items.value = []
  const contains: typeof items.value = []
  for (const i of items.value) {
    if (ex.has(i.id))
      continue
    const n = i.name.toLowerCase()
    if (n.startsWith(q))
      startsWith.push(i)
    else if (n.includes(q))
      contains.push(i)
  }
  return [...startsWith, ...contains].slice(0, 40)
})

const selected = ref<string | null>(null)
function onAccept(id: string | null | undefined) {
  if (id)
    emit('submit', id)
  selected.value = null
  query.value = ''
}

function tierColor(rarity: string): string {
  const key = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase()
  return TIER_COLORS[key] ?? TIER_COLORS.Normal!
}

// Width tracking: Reka's --reka-combobox-trigger-width var is not exposed
// reliably across versions, so we measure the anchor on mount + resize and
// pin the dropdown to that pixel width. Mirrors the FilterCombobox pattern
// already used elsewhere in the codebase.
const anchorRef = ref<HTMLElement | null>(null)
const anchorWidth = ref(0)
function measureAnchor() {
  if (anchorRef.value)
    anchorWidth.value = anchorRef.value.getBoundingClientRect().width
}
onMounted(() => {
  measureAnchor()
  if (typeof window !== 'undefined')
    window.addEventListener('resize', measureAnchor)
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined')
    window.removeEventListener('resize', measureAnchor)
})

// On mobile the soft keyboard occludes a dropdown opened below the input;
// flip it above the input so suggestions remain visible while typing.
const isMobile = useMediaQuery('(max-width: 640px)')
const dropdownSide = computed<'top' | 'bottom'>(() => isMobile.value ? 'top' : 'bottom')
</script>

<template>
  <ComboboxRoot
    v-model="selected"
    :disabled="disabled"
    ignore-filter
    @update:model-value="onAccept"
  >
    <ComboboxAnchor :ref="el => (anchorRef = (el as { $el?: HTMLElement })?.$el ?? (el as HTMLElement | null))" class="combo-anchor">
      <div class="combo-frame">
        <ComboboxInput
          v-model="query"
          class="combo-input"
          placeholder="Type to guess…"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          inputmode="search"
          enterkeyhint="go"
        />
        <Search :size="18" :stroke-width="2.2" class="combo-magnifier" />
      </div>
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent
        class="combo-content"
        position="popper"
        :side="dropdownSide"
        :side-offset="8"
        :style="anchorWidth ? { width: `${anchorWidth}px` } : undefined"
      >
        <ComboboxViewport class="combo-viewport">
          <ComboboxEmpty class="combo-empty">
            No items match.
          </ComboboxEmpty>
          <ComboboxItem
            v-for="i in filtered"
            :key="i.id"
            :value="i.id"
            :text-value="i.name"
            class="combo-item"
            :style="{ '--tier-color': tierColor(i.rarity) }"
          >
            <img
              v-if="itemIconUrl(i)"
              :src="itemIconUrl(i)!"
              alt=""
              class="combo-item-sprite pixelated"
              width="24"
              height="24"
              loading="lazy"
            >
            <span v-else class="combo-item-sprite combo-item-sprite-blank" aria-hidden="true" />
            <span class="combo-item-name">{{ i.name }}</span>
            <span class="combo-item-rarity">{{ i.rarity }}</span>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style scoped>
.combo-anchor {
  display: block;
  width: 100%;
}

.combo-frame {
  position: relative;
  display: flex;
  align-items: center;
  background: rgb(137 118 101);
  border: 2px solid rgb(65 38 36);
  box-shadow:
    inset 0 1px 0 rgb(0 0 0 / 0.18),
    inset 0 -1px 0 rgb(176 156 132);
}

.combo-input {
  flex: 1;
  width: 100%;
  padding: 14px 50px 14px 16px;
  background: transparent;
  border: none;
  color: rgb(255 255 255);
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.04em;
  outline: none;
}

.combo-input::placeholder {
  color: rgb(255 255 255 / 0.55);
}

.combo-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.combo-frame:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.combo-magnifier {
  position: absolute;
  right: 14px;
  color: rgb(255 255 255 / 0.7);
  pointer-events: none;
}

@media (max-width: 640px) {
  .combo-input {
    /* 16px suppresses iOS Safari's auto-zoom on focus. The next visible
       smaller value (15px) still triggers the zoom. */
    font-size: 16px;
    padding: 14px 50px 14px 14px;
  }
}
</style>

<!-- ── Portal content lives outside the scoped tree ──
   ComboboxPortal teleports the dropdown to document.body, so any styles
   scoped to this component (Vue compiles `data-v-xxxx` selectors) won't
   match. Move the dropdown rules to an unscoped block at the bottom so
   they apply globally. They're prefixed with .combo-content to stay
   namespace-scoped at the class level. -->
<style>
.combo-content {
  background-color: var(--paper-base);
  background-image: none;
  box-shadow: var(--wood-shadow-medium);
  border: 2px solid var(--paper-bd);
  max-height: 360px;
  overflow: hidden;
  z-index: 1000;
  font-family: var(--font-body);
}

.combo-viewport {
  max-height: 360px;
  overflow-y: auto;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--paper-bd) transparent;
}

.combo-empty {
  padding: 12px 14px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--paper-text);
}

.combo-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  outline: none;
  border: 2px solid transparent;
  transition: background-color 0.1s ease-out;
}

.combo-item:hover,
.combo-item[data-highlighted] {
  background-color: var(--paper-light);
  border-color: var(--primary);
}

.combo-item-sprite {
  width: 24px;
  height: 24px;
  display: block;
  flex-shrink: 0;
}

.combo-item-sprite-blank {
  background: rgb(65 38 36 / 0.16);
  border: 1px solid rgb(65 38 36 / 0.32);
}

.combo-item-name {
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--tier-color, var(--paper-text-strong));
  text-shadow: 1.5px 1.5px 0 rgb(0 0 0 / 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.combo-item-rarity {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--paper-text);
  opacity: 0.7;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .combo-item {
    grid-template-columns: 28px minmax(0, 1fr) auto;
    padding: 10px 12px;
  }

  .combo-item-name {
    font-size: 15px;
  }

  .combo-item-rarity {
    font-size: 9px;
  }
}
</style>
