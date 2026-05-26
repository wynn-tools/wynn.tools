<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import MapCloseBtn from '~/components/map/MapCloseBtn.vue'

const STATIC_REPO = 'https://github.com/Wynntils/Static-Storage/blob/main'
const ATHENA = 'https://athena.wynntils.com'
const WYNNCRAFT_API = 'https://api.wynncraft.com'
const HADES = 'https://io.wynntils.com'

interface Source {
  label: string
  href: string
  display: string
  origin?: string
  originHref?: string
}

interface SourceGroup {
  name: string
  url: string
  sources: Source[]
}

const groups: SourceGroup[] = [
  {
    name: 'Wynntils',
    url: 'https://github.com/Wynntils',
    sources: [
      { label: 'Map tiles', href: `${STATIC_REPO}/Reference/maps.json`, display: 'Reference/maps.json', origin: 'Static-Storage', originHref: 'https://github.com/Wynntils/Static-Storage' },
      { label: 'Places', href: `${STATIC_REPO}/Reference/place_mapfeatures.json`, display: 'Reference/place_mapfeatures.json', origin: 'Static-Storage', originHref: 'https://github.com/Wynntils/Static-Storage' },
      { label: 'Combat locations', href: `${STATIC_REPO}/Data-Storage/combat_locations.json`, display: 'Data-Storage/combat_locations.json', origin: 'Static-Storage', originHref: 'https://github.com/Wynntils/Static-Storage' },
      { label: 'Caves', href: `${STATIC_REPO}/Reference/caves.json`, display: 'Reference/caves.json', origin: 'Static-Storage', originHref: 'https://github.com/Wynntils/Static-Storage' },
      { label: 'Services', href: `${STATIC_REPO}/Data-Storage/services_crowdsourced.json`, display: 'Data-Storage/services_crowdsourced.json', origin: 'Static-Storage', originHref: 'https://github.com/Wynntils/Static-Storage' },
      { label: 'Map icons', href: 'https://github.com/Wynntils/Wynntils', display: 'github.com/Wynntils/Wynntils', origin: 'Wynntils', originHref: 'https://github.com/Wynntils/Wynntils' },
      { label: 'Territory list', href: `${ATHENA}/cache/get/territoryList`, display: '/cache/get/territoryList', origin: 'Athena', originHref: ATHENA },
      { label: 'Live player locations', href: `${HADES}/api/getMyLocation`, display: '/api/getMyLocation', origin: 'Hades', originHref: HADES },
    ],
  },
  {
    name: 'Wynncraft API (api.wynncraft.com)',
    url: WYNNCRAFT_API,
    sources: [
      { label: 'Player locations', href: `${WYNNCRAFT_API}/v3/map/locations/player`, display: '/v3/map/locations/player' },
      { label: 'Guild leaderboard', href: `${WYNNCRAFT_API}/v3/leaderboards/guildTerritories`, display: '/v3/leaderboards/guildTerritories' },
    ],
  },
]

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onOutsideClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node))
    open.value = false
}

onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="rounded-md bg-bg/80 px-2.5 py-1.5 text-[11px] font-medium text-muted/60 ring-1 ring-copper/15 backdrop-blur transition-colors hover:text-muted hover:ring-copper/35"
      :aria-expanded="open"
      @click="open = !open"
    >
      Sources
    </button>

    <!-- Desktop popup -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="open"
        class="absolute bottom-full left-0 z-[500] mb-2 hidden w-[420px] rounded-lg bg-bg/95 p-4 ring-1 ring-copper/20 backdrop-blur md:block"
      >
        <p class="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted/40">
          Data sources
        </p>
        <div class="flex flex-col gap-4">
          <div v-for="group in groups" :key="group.name">
            <a
              :href="group.url"
              target="_blank"
              rel="noopener noreferrer"
              class="mb-1.5 block text-[10px] font-semibold text-copper/50 transition-colors hover:text-copper/80"
            >
              {{ group.name }}
            </a>
            <ul class="flex flex-col gap-1">
              <li v-for="src in group.sources" :key="src.href" class="flex items-baseline justify-between gap-3">
                <span class="shrink-0 text-xs text-muted/60">{{ src.label }}</span>
                <div class="flex min-w-0 items-baseline gap-2">
                  <a
                    v-if="src.origin && src.originHref"
                    :href="src.originHref"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="shrink-0 text-[10px] text-copper/40 transition-colors hover:text-copper/70"
                  >
                    {{ src.origin }}
                  </a>
                  <a
                    :href="src.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="truncate font-mono text-[10px] text-muted/40 transition-colors hover:text-copper"
                  >
                    {{ src.display }}
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mobile bottom sheet -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-full opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-x-0 bottom-0 z-[600] max-h-[70vh] overflow-y-auto rounded-t-2xl bg-bg p-4 shadow-2xl ring-1 ring-copper/20 md:hidden"
        >
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-copper">
              Data sources
            </h3>
            <MapCloseBtn aria-label="Close sources" @click="open = false" />
          </div>
          <div class="flex flex-col gap-4">
            <div v-for="group in groups" :key="group.name">
              <a
                :href="group.url"
                target="_blank"
                rel="noopener noreferrer"
                class="mb-1.5 block text-[10px] font-semibold text-copper/50 transition-colors hover:text-copper/80"
              >
                {{ group.name }}
              </a>
              <ul class="flex flex-col gap-1">
                <li v-for="src in group.sources" :key="src.href" class="flex items-baseline justify-between gap-3">
                  <span class="shrink-0 text-xs text-muted/60">{{ src.label }}</span>
                  <a
                    :href="src.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="truncate font-mono text-[10px] text-muted/40 transition-colors hover:text-copper"
                  >
                    {{ src.display }}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
