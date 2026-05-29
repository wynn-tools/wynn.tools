<script setup lang="ts">
import type { SearchTome } from '~/lib/items-search/types'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import { emblemUrl, frameUrl, miscUrl, spriteUrl } from '~/lib/items/icon'
import { ID_BAD_COLOR, ID_GOOD_COLOR, idIsGood, tierTheme } from '~/lib/items/tooltip'

const props = defineProps<{ tome: SearchTome }>()

const normalizedTier = computed(() => {
  const t = props.tome.tier
  return t.charAt(0).toUpperCase() + t.slice(1)
})

const theme = computed(() => tierTheme(normalizedTier.value))
const frame = computed(() => frameUrl(normalizedTier.value.toLowerCase()))
const emblem = computed(() => emblemUrl(props.tome.emblem))
const sprite = spriteUrl('tome')

const innerStyle = computed(() => ({
  background: `linear-gradient(#0d0d0df7, ${theme.value.bg}f7)`,
  margin: theme.value.margin,
}))
const frameStyle = computed(() => frame.value
  ? { borderImage: `url(${frame.value}) 25 10 / 8 3 / 0 stretch` }
  : { border: `2px solid ${theme.value.color}` })

const TOME_TYPE_LABELS: Record<string, string> = {
  weapon_tome: 'Weapon',
  armour_tome: 'Armour',
  guild_tome: 'Guild',
  lootrun_tome: 'Lootrun',
  mysticism_tome: 'Mysticism',
  marathon_tome: 'Marathon',
  expertise_tome: 'Expertise',
}

const typeLabel = computed(() => TOME_TYPE_LABELS[props.tome.type] ?? props.tome.type)

interface IdRow { label: string, unit: string, min: number, max: number, color: string }
const idRows = computed<IdRow[]>(() =>
  Object.entries(props.tome.identifications).map(([key, r]) => {
    const { label, unit } = humanizeField(key)
    const color = idIsGood(r.raw, isInverted(key)) ? ID_GOOD_COLOR : ID_BAD_COLOR
    return { label, unit, min: r.min, max: r.max, color }
  }),
)

function sepStyle() {
  return {
    maskImage: `url(${miscUrl('line')})`,
    WebkitMaskImage: `url(${miscUrl('line')})`,
    background: theme.value.light,
  }
}
</script>

<template>
  <div class="tt-container">
    <div class="tt-frame" :style="frameStyle" />
    <div class="tt-inner" :style="innerStyle">
      <div class="tt-header">
        <div class="tt-emblemwrap">
          <img v-if="emblem" :src="emblem" class="tt-emblem" alt="" aria-hidden="true">
          <img :src="sprite" class="tt-sprite" alt="" aria-hidden="true">
        </div>
        <div class="tt-headtext">
          <span class="tt-name" :style="{ color: theme.color }">{{ tome.displayName }}</span>
          <div class="tt-tags">
            <span class="tt-tag" :style="{ background: theme.color }">{{ normalizedTier.toLowerCase() }}</span>
            <span class="tt-tag" :style="{ background: theme.light }">{{ typeLabel }} Tome</span>
          </div>
        </div>
      </div>

      <div class="tt-sep" :style="sepStyle()" />

      <div class="tt-meta-row">
        <span class="tt-meta-label">
          <img :src="miscUrl('check')" class="tt-check" alt="" aria-hidden="true"> Combat Level
        </span>
        <span class="tt-muted">{{ tome.level }}</span>
      </div>

      <template v-if="idRows.length">
        <div class="tt-sep" :style="sepStyle()" />
        <ul class="tt-ids">
          <li v-for="row in idRows" :key="row.label" class="tt-id">
            <span class="tt-id-name">{{ row.label }}</span>
            <span class="tt-id-range">
              <span :style="{ color: row.color }">{{ row.min > 0 ? '+' : '' }}{{ row.min }}{{ row.unit }}</span>
              <span class="tt-id-arrow">to</span>
              <span :style="{ color: row.color }">{{ row.max > 0 ? '+' : '' }}{{ row.max }}{{ row.unit }}</span>
            </span>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tt-container {
  position: relative;
  width: 100%;
  max-width: 482px;
  font-family: 'wynncraft', var(--font-mono);
  letter-spacing: -1px;
  overflow: hidden;
}
.tt-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 10px solid transparent;
  image-rendering: pixelated;
  pointer-events: none;
  z-index: 1;
}
.tt-inner {
  position: relative;
  padding: 26px 20px 16px;
  min-height: 150px;
  color: #fcfcfc;
}
.tt-header {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}
.tt-emblemwrap {
  position: relative;
  min-width: 80px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tt-emblem {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  transform: scale(1.2);
}
.tt-sprite {
  position: relative;
  width: 44px;
  height: 44px;
  image-rendering: pixelated;
  object-fit: contain;
}
.tt-headtext {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.tt-name {
  font-size: 26px;
  line-height: 1;
  text-shadow: 3px 3px 0 rgb(0 0 0 / 0.45);
}
.tt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.tt-tag {
  color: #000;
  font-family: 'wynn-five', 'wynn-default', var(--font-mono);
  font-size: 16px;
  line-height: 14px;
  padding: 2px 6px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
}
.tt-sep {
  width: 316px;
  max-width: 100%;
  height: 25px;
  margin: 10px auto 0;
  image-rendering: pixelated;
  mask-repeat: no-repeat;
  mask-size: cover;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: cover;
}
.tt-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-size: 18px;
}
.tt-meta-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fcfcfc;
}
.tt-check {
  width: 22px;
  height: 18px;
  image-rendering: pixelated;
  object-fit: contain;
}
.tt-muted {
  color: #aeaeae;
}
.tt-ids {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tt-id {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 18px;
  gap: 12px;
}
.tt-id-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
.tt-id-range {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.tt-id-arrow {
  color: #82c39b;
  font-size: 17px;
}
</style>
