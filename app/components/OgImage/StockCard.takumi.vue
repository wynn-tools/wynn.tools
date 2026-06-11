<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    kind?: string
    category?: string
    classes?: string[]
    author?: string
    installCount?: number
    reactionTotal?: number
  }>(),
  {
    title: 'Stock creation',
    description: '',
    kind: 'infobox',
    category: 'qol',
    classes: () => [],
    author: '',
    installCount: 0,
    reactionTotal: 0,
  },
)

const C = {
  ground: '#0d0d0d',
  text: '#eceef2',
  muted: '#9aa0ad',
  faint: '#646c7a',
  seam: '#272d39',
  brand: '#4a9bf5',
}

/* eslint-disable style/quotes -- double quotes are load-bearing for og-image font scanner */
const PIXEL_STYLE = { fontFamily: "'WynncraftOg', 'Barlow Semi Condensed', sans-serif" }
const SANS_STYLE = { fontFamily: "'Geist Mono', monospace" }
const FIVE_STYLE = { fontFamily: "'WynnFive', sans-serif" }
/* eslint-enable style/quotes */
const PIXEL = PIXEL_STYLE.fontFamily
const SANS = SANS_STYLE.fontFamily
const FIVE = FIVE_STYLE.fontFamily

const subtitle = computed(() => {
  const parts = [props.kind, props.category]
  if (props.classes.length)
    parts.push(props.classes.join(', '))
  return parts.join(' · ')
})
</script>

<template>
  <div
    :style="{
      display: 'flex',
      width: '100%',
      height: '100%',
      background: C.ground,
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: PIXEL,
    }"
  >
    <div
      :style="{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: C.ground,
        border: `3px solid ${C.brand}`,
        borderRadius: '10px',
        padding: '40px 52px',
        boxSizing: 'border-box',
        color: C.text,
        justifyContent: 'space-between',
      }"
    >
      <div :style="{ display: 'flex', flexDirection: 'column' }">
        <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }">
          <span
            :style="{
              display: 'flex',
              fontFamily: FIVE,
              fontSize: '22px',
              lineHeight: 1,
              color: '#0c0e12',
              background: C.brand,
              padding: '5px 12px',
              borderRadius: '3px',
            }"
          >{{ kind }}</span>
          <div :style="{ display: 'flex', alignItems: 'center', gap: '10px' }">
            <img src="/favicon.svg" width="22" height="22" alt="">
            <div :style="{ display: 'flex', fontFamily: SANS, fontSize: '15px', letterSpacing: '-0.02em', color: C.text }">
              <span :style="{ display: 'flex' }">wynn</span>
              <span :style="{ display: 'flex', color: C.brand }">.</span>
              <span :style="{ display: 'flex' }">tools/stock</span>
            </div>
          </div>
        </div>
        <span
          :style="{
            display: 'flex',
            fontFamily: PIXEL,
            fontSize: '70px',
            lineHeight: 1.05,
            color: C.text,
            marginTop: '28px',
            textShadow: '3px 3px 0 rgba(0,0,0,0.45)',
          }"
        >{{ title }}</span>
        <span
          v-if="description"
          :style="{
            display: 'flex',
            fontFamily: SANS,
            fontSize: '26px',
            lineHeight: 1.25,
            color: C.muted,
            marginTop: '22px',
            maxHeight: '90px',
            overflow: 'hidden',
          }"
        >{{ description }}</span>
      </div>

      <div :style="{ display: 'flex', height: '2px', background: C.seam, margin: '24px 0' }" />

      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }">
        <div :style="{ display: 'flex', flexDirection: 'column' }">
          <span
            :style="{
              display: 'flex',
              fontFamily: SANS,
              fontSize: '14px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: C.faint,
            }"
          >by {{ author || 'anonymous' }}</span>
          <span
            :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '22px', marginTop: '6px', color: C.text }"
          >{{ subtitle }}</span>
        </div>
        <div :style="{ display: 'flex', alignItems: 'baseline', gap: '32px' }">
          <span :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '34px', color: C.brand }">
            ↓ {{ installCount }}
          </span>
          <span :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '34px', color: C.text }">
            ★ {{ reactionTotal }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
