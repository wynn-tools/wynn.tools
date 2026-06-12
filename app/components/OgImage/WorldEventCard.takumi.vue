<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string
    region?: string
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | string
    level?: number
  }>(),
  {
    name: 'World Event',
    region: 'Unknown Region',
    difficulty: 'EASY',
    level: 0,
  },
)

const C = {
  ground: '#0d0d0d',
  panel: '#0e1117',
  text: '#eceef2',
  muted: '#9aa0ad',
  faint: '#646c7a',
  seam: '#272d39',
  brand: '#4a9bf5',
}

const DIFF_COLOR: Record<string, string> = {
  EASY: '#83f7c6',
  MEDIUM: '#f0c24a',
  HARD: '#f78383',
}

const diffColor = computed(() => DIFF_COLOR[props.difficulty] ?? C.muted)

// nuxt-og-image's build-time font scanner only registers a family it sees as a
// literal fontFamily string value (og-image's RE_JS_FONT_FAMILY) — it cannot
// follow a variable. Declaring the stacks as object literals keeps that literal
// in <script setup> so the OG renderer actually loads WynncraftOg + Geist Mono —
// which must ALSO be declared `global: true` in nuxt.config. Double quotes are
// required: the value itself contains single quotes.
/* eslint-disable style/quotes -- double quotes are load-bearing: single-quoting
   would escape the inner family quotes and break og-image's RE_JS_FONT_FAMILY. */
const PIXEL_STYLE = {
  fontFamily: "'WynncraftOg', 'Barlow Semi Condensed', sans-serif",
}
const SANS_STYLE = { fontFamily: "'Geist Mono', monospace" }
const FIVE_STYLE = { fontFamily: "'WynnFive', sans-serif" }
/* eslint-enable style/quotes */
const PIXEL = PIXEL_STYLE.fontFamily
const SANS = SANS_STYLE.fontFamily
const FIVE = FIVE_STYLE.fontFamily
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
        background: `linear-gradient(${C.ground}, ${C.panel})`,
        border: `3px solid ${C.brand}`,
        borderRadius: '10px',
        padding: '48px 60px',
        boxSizing: 'border-box',
        color: C.text,
      }"
    >
      <!-- Header: kicker + wynn.tools mark -->
      <div
        style="display: flex; align-items: center; justify-content: space-between;"
      >
        <span
          :style="{
            display: 'flex',
            fontFamily: SANS,
            fontSize: '18px',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: C.faint,
          }"
        >World Event</span>
        <div :style="{ display: 'flex', alignItems: 'center', gap: '10px' }">
          <img
            src="/favicon.svg"
            width="22"
            height="22"
            alt=""
          >
          <div :style="{ display: 'flex', fontFamily: SANS, fontSize: '15px', letterSpacing: '-0.02em', color: C.text }">
            <span :style="{ display: 'flex' }">wynn</span>
            <span :style="{ display: 'flex', color: C.brand }">.</span>
            <span :style="{ display: 'flex' }">tools</span>
          </div>
        </div>
      </div>

      <!-- Event name -->
      <div style="display: flex; margin-top: 36px;">
        <span
          :style="{
            display: 'flex',
            fontFamily: PIXEL,
            fontSize: '88px',
            lineHeight: 1,
            color: C.text,
            textShadow: '3px 3px 0 rgba(0,0,0,0.45)',
          }"
        >{{ name }}</span>
      </div>

      <!-- Seam -->
      <div
        :style="{
          display: 'flex',
          height: '2px',
          background: C.seam,
          margin: '36px 0 32px',
        }"
      />

      <!-- Badges row -->
      <div
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }"
      >
        <span
          :style="{
            display: 'flex',
            fontFamily: FIVE,
            fontSize: '26px',
            lineHeight: 1,
            color: '#0c0e12',
            background: C.brand,
            padding: '8px 16px',
            borderRadius: '4px',
          }"
        >{{ region }}</span>
        <span
          :style="{
            display: 'flex',
            fontFamily: FIVE,
            fontSize: '26px',
            lineHeight: 1,
            color: C.text,
            border: `2px solid ${C.seam}`,
            padding: '8px 16px',
            borderRadius: '4px',
          }"
        >lv {{ level }}</span>
        <span
          :style="{
            display: 'flex',
            fontFamily: FIVE,
            fontSize: '26px',
            lineHeight: 1,
            color: '#0c0e12',
            background: diffColor,
            padding: '8px 16px',
            borderRadius: '4px',
          }"
        >{{ difficulty }}</span>
      </div>
    </div>
  </div>
</template>
