<script setup lang="ts">
import type { SearchMaterial } from '~/lib/items-search/types'
import { emblemUrl, frameUrl, miscUrl, professionUrl, spriteUrl } from '~/lib/items/icon'

const props = defineProps<{ material: SearchMaterial }>()

// Teal palette matching official material tooltip
const MAT_COLOR = '#00ccff'
const MAT_LIGHT = '#90d9f3'
const MAT_BG = '#08253c'
const STAR_FILL = '#07f2f0'
const STAR_EMPTY = '#111111'

const frame = frameUrl('material')
const emblem = emblemUrl('square')
const sprite = spriteUrl('material')

const innerStyle = { background: `linear-gradient(#0d0d0df7, ${MAT_BG}f7)` }
const frameStyle = frame
  ? { borderImage: `url(${frame}) 25 10 / 8 3 / 0 stretch` }
  : { border: `2px solid ${MAT_COLOR}` }

const profIcon = computed(() => professionUrl(props.material.subType))

// Derive star count: highest non-zero tier = star count
const starCount = computed(() => {
  const { tier3, tier2, tier1 } = props.material.chances
  if (tier3 > 0)
    return 3
  if (tier2 > 0)
    return 2
  if (tier1 > 0)
    return 1
  return 0
})

const stars = computed(() =>
  Array.from({ length: 3 }, (_, i) => ({
    color: i < starCount.value ? STAR_FILL : STAR_EMPTY,
  })),
)

function starStyle(color: string) {
  return {
    maskImage: `url(${miscUrl('star')})`,
    WebkitMaskImage: `url(${miscUrl('star')})`,
    background: color,
  }
}

function sepStyle() {
  return {
    maskImage: `url(${miscUrl('line')})`,
    WebkitMaskImage: `url(${miscUrl('line')})`,
    background: MAT_LIGHT,
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
          <span class="tt-name" :style="{ color: MAT_COLOR }">{{ material.displayName }}</span>
          <div class="tt-tags">
            <span class="tt-tag tt-tag--stars">
              <span v-for="(s, i) in stars" :key="i" class="tt-star" :style="starStyle(s.color)" />
            </span>
            <span class="tt-tag" :style="{ background: MAT_LIGHT }">material</span>
          </div>
        </div>
      </div>

      <div class="tt-sep" :style="sepStyle()" />

      <div class="tt-meta-row">
        <span class="tt-meta-label">
          <img :src="miscUrl('check')" class="tt-check" alt="" aria-hidden="true">
          <img :src="profIcon" class="tt-prof" alt="" aria-hidden="true">
          <span class="tt-meta-subtype">{{ material.subType }}</span> Level
        </span>
        <span class="tt-muted">{{ material.level }}</span>
      </div>

      <template v-if="material.lore?.length">
        <div class="tt-sep" :style="sepStyle()" />
        <p class="tt-lore">
          <span
            v-for="(seg, i) in material.lore" :key="i"
            :style="{ color: seg.color ?? '#aaaaaa' }"
            :class="seg.font ? `tt-lore--${seg.font}` : 'tt-lore--ascii'"
          >{{ seg.text }}</span>
        </p>
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
  text-transform: lowercase;
}
.tt-tag--stars {
  background: #636363;
  padding: 3px 6px;
  gap: 5px;
}
.tt-star {
  display: inline-block;
  width: 16px;
  height: 12px;
  image-rendering: pixelated;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
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
  gap: 6px;
  color: #fcfcfc;
  text-transform: capitalize;
}
.tt-check {
  width: 22px;
  height: 18px;
  image-rendering: pixelated;
  object-fit: contain;
}
.tt-prof {
  width: 28px;
  height: 28px;
  image-rendering: pixelated;
  object-fit: cover;
}
.tt-meta-subtype {
  text-transform: capitalize;
}
.tt-muted {
  color: #aeaeae;
}
.tt-lore {
  margin: 4px 0 0;
  font-size: 17px;
  line-height: 1.4;
  color: #aaaaaa;
}
.tt-lore--ascii {
  font-family: 'wynn-ascii', var(--font-mono);
}
.tt-lore--default {
  font-family: 'wynn-default', var(--font-mono);
}
.tt-lore--common {
  font-family: 'wynn-common', var(--font-mono);
}
.tt-lore--wynnic {
  font-family: 'wynn-wynnic', var(--font-mono);
}
.tt-lore--high_gavelian {
  font-family: 'wynn-high-gavelian', var(--font-mono);
}
.tt-lore--old_fruman {
  font-family: 'wynn-old-fruman', var(--font-mono);
}
.tt-lore--profession {
  font-family: 'wynn-common', var(--font-mono);
}
</style>
