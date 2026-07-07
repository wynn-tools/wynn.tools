<script setup lang="ts">
import type { ThemePref } from '~/composables/useTheme'
import { Check, Palette } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'

const { pref, setTheme } = useTheme()

const open = ref(false)
const wrapRef = ref<HTMLElement | null>(null)
onClickOutside(wrapRef, () => (open.value = false))

watch(pref, () => (open.value = false))

// Literal preview colors per option (must render each theme's own palette
// regardless of the active theme, so they can't use --color-* tokens).
const swatches: { value: ThemePref, label: string, bg: string, panel: string, accent: string, split?: string }[] = [
  { value: 'system', label: 'System', bg: 'oklch(16% 0.008 265)', panel: 'oklch(26% 0.012 265)', accent: 'oklch(68% 0.16 245)', split: 'oklch(96.5% 0.004 265)' },
  { value: 'light', label: 'Light', bg: 'oklch(96.5% 0.004 265)', panel: 'oklch(88% 0.008 265)', accent: 'oklch(56% 0.18 245)' },
  { value: 'dark', label: 'Dark', bg: 'oklch(16% 0.008 265)', panel: 'oklch(26% 0.012 265)', accent: 'oklch(68% 0.16 245)' },
  { value: 'midnight', label: 'Midnight', bg: 'oklch(9% 0.006 265)', panel: 'oklch(18% 0.01 265)', accent: 'oklch(70% 0.16 245)' },
]
</script>

<template>
  <div ref="wrapRef" class="theme-picker">
    <button
      class="theme-trigger"
      type="button"
      :aria-expanded="open"
      aria-haspopup="true"
      aria-label="Change appearance"
      @click="open = !open"
    >
      <Palette :size="17" aria-hidden="true" />
    </button>

    <Transition name="theme-pop">
      <div v-if="open" class="theme-panel" role="menu">
        <span class="theme-panel-label">Appearance</span>
        <div class="theme-swatches">
          <button
            v-for="s in swatches"
            :key="s.value"
            class="swatch"
            :class="{ on: pref === s.value }"
            type="button"
            role="menuitemradio"
            :aria-checked="pref === s.value"
            @click="setTheme(s.value, { origin: $event.currentTarget as HTMLElement })"
          >
            <span
              class="swatch-chip"
              :style="{ background: s.split ? `linear-gradient(135deg, ${s.split} 0 50%, ${s.bg} 50% 100%)` : s.bg }"
            >
              <span class="swatch-bar" :style="{ background: s.panel }" />
              <span class="swatch-dot" :style="{ background: s.accent }" />
              <span v-if="pref === s.value" class="swatch-check">
                <Check :size="11" :stroke-width="3" aria-hidden="true" />
              </span>
            </span>
            <span class="swatch-name">{{ s.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.theme-picker {
  position: relative;
  display: flex;
  align-items: center;
}

.theme-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}

.theme-trigger:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.theme-trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.theme-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: color-mix(in oklch, var(--color-surface) 96%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid color-mix(in oklch, var(--color-accent) 20%, transparent);
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 4px 24px oklch(0% 0 0 / 0.3);
  z-index: 100;
}

.theme-panel-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin-bottom: 10px;
}

.theme-swatches {
  display: flex;
  gap: 8px;
}

.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.swatch-chip {
  position: relative;
  display: block;
  width: 46px;
  height: 38px;
  border-radius: 7px;
  border: 1px solid color-mix(in oklch, var(--color-text) 14%, transparent);
  overflow: hidden;
  transition:
    box-shadow 0.12s ease-out,
    transform 0.12s ease-out;
}

.swatch:hover .swatch-chip {
  transform: scale(1.04);
}

.swatch.on .swatch-chip {
  border-color: transparent;
  box-shadow: 0 0 0 2px var(--color-accent);
}

.swatch-bar {
  position: absolute;
  left: 7px;
  top: 9px;
  width: 22px;
  height: 5px;
  border-radius: 3px;
}

.swatch-dot {
  position: absolute;
  left: 7px;
  bottom: 8px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.swatch-check {
  position: absolute;
  right: 3px;
  top: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-bg);
}

.swatch-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-muted);
  transition: color 0.12s ease-out;
}

.swatch.on .swatch-name {
  color: var(--color-text);
}

.swatch:focus-visible {
  outline: none;
}

.swatch:focus-visible .swatch-chip {
  box-shadow: 0 0 0 2px var(--color-accent);
}

.theme-pop-enter-active,
.theme-pop-leave-active {
  transition:
    opacity 0.12s ease-out,
    transform 0.12s ease-out;
}

.theme-pop-enter-from,
.theme-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Touch needs a 44px hit area; the icon stays 17px, centered. */
@media (max-width: 720px) {
  .theme-trigger {
    width: 44px;
    height: 44px;
  }
}
</style>
