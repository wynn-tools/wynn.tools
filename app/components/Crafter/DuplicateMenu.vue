<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { useCraftStore } from '~/stores/craft'

const store = useCraftStore()
const router = useRouter()

const menuOpen = ref(false)
const wrapRef = ref<HTMLElement | null>(null)

onClickOutside(wrapRef, () => {
  menuOpen.value = false
})

function duplicate() {
  if (!store.shareHash)
    return
  router.push(`/crafter/${store.shareHash}`)
}

function startBlank() {
  menuOpen.value = false
  router.push('/crafter')
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
</script>

<template>
  <div ref="wrapRef" class="dup-wrap">
    <button
      class="dup-btn"
      type="button"
      title="Open a copy in the crafter"
      :disabled="!store.shareHash || store.loading"
      @click="duplicate"
    >
      Duplicate
    </button>
    <button
      class="dup-more"
      type="button"
      aria-label="More"
      title="More"
      :aria-expanded="menuOpen"
      :disabled="store.loading"
      @click="toggleMenu"
    >
      <span aria-hidden="true">⋯</span>
    </button>

    <div v-if="menuOpen" class="menu" role="menu">
      <button class="menu-item" type="button" role="menuitem" @click="startBlank">
        Start blank
      </button>
    </div>
  </div>
</template>

<style scoped>
.dup-wrap {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 4px;
  flex-shrink: 0;
}

.dup-btn,
.dup-more {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.12s ease-out,
    border-color 0.12s ease-out;
}

.dup-btn {
  padding: 6px 14px;
}

.dup-more {
  padding: 6px 8px;
  line-height: 1;
  font-size: 14px;
  letter-spacing: 0;
}

.dup-btn:not(:disabled):hover,
.dup-more:not(:disabled):hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.dup-btn:disabled,
.dup-more:disabled {
  opacity: 0.35;
  cursor: default;
}

.dup-btn:focus-visible,
.dup-more:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px;
  min-width: 140px;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.menu-item {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    background-color 0.12s ease-out;
}

.menu-item:hover {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}

.menu-item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

@media (max-width: 640px) {
  .menu {
    bottom: calc(100% + 6px);
    top: auto;
  }
}
</style>
