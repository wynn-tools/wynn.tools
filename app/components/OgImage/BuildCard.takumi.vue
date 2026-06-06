<script setup lang="ts">
import { computed } from 'vue'

interface Item {
  slot: string
  name: string
  tier?: string | null
  icon?: string | null
  powders?: string
}
interface Sp {
  skill: string
  value: number
  active: boolean
  discUrl: string
  iconUrl: string
}
interface Def {
  element: string
  iconUrl: string
  value: string
  positive: boolean
}
interface Combat {
  name: string
  dps: number
}
interface Credit { username: string, name: string }

const props = withDefaults(
  defineProps<{
    name?: string | null
    level?: number
    className?: string
    weaponIconUrl?: string
    items?: Item[]
    totalHp?: number
    ehp?: number
    combatLines?: Combat[]
    sp?: Sp[]
    elementalDefenses?: Def[]
    credits?: Credit[]
    tags?: string[]
  }>(),
  {
    name: null,
    level: 0,
    className: 'Build',
    weaponIconUrl: '',
    items: () => [],
    totalHp: 0,
    ehp: 0,
    combatLines: () => [],
    sp: () => [],
    elementalDefenses: () => [],
    credits: () => [],
    tags: () => [],
  },
)

const bylineText = computed(() => {
  const list = props.credits.slice(0, 3).map(c => c.name).join(', ')
  const overflow = props.credits.length > 3 ? `, +${props.credits.length - 3}` : ''
  return list ? `with ${list}${overflow}` : ''
})

function formatStat(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const C = {
  ground: '#0d0d0d',
  text: '#eceef2',
  muted: '#9aa0ad',
  faint: '#646c7a',
  seam: '#272d39',
  good: '#83f7c6',
  bad: '#f78383',
  brand: '#4a9bf5',
}

// In-game rarity name colours (mythic brightened for dark legibility).
const RARITY: Record<string, string> = {
  Normal: '#ffffff',
  Unique: '#ffff55',
  Rare: '#ff55ff',
  Legendary: '#55ffff',
  Fabled: '#ff5555',
  Mythic: '#d6279c',
  Set: '#55ff55',
  Crafted: '#00bcd4',
}

// Per-class accent + dark background tint, echoing the in-builder class theming.
const CLASS_COLOR: Record<string, string> = {
  Warrior: '#f0584f',
  Mage: '#5aa9f0',
  Archer: '#5fcf7a',
  Assassin: '#f0c24a',
  Shaman: '#b07ff0',
}
const CLASS_BG: Record<string, string> = {
  Warrior: '#1c0f0e',
  Mage: '#0c1320',
  Archer: '#0c1a10',
  Assassin: '#1a140a',
  Shaman: '#150f1c',
}

const headColor = computed(() => CLASS_COLOR[props.className] ?? C.brand)
const classBg = computed(() => CLASS_BG[props.className] ?? '#0e1117')
const headline = computed(
  () =>
    props.name
    || (props.className === 'Build' ? 'Build' : `${props.className} Build`),
)

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

function rarityColor(tier?: string | null): string {
  if (!tier)
    return C.faint
  return RARITY[tier] ?? C.text
}

// items arrive in builder slot order: 0-3 armour, 4-7 accessories, 8 weapon.
// equipColumns is a plain array of arrays (not an array of refs) so the
// template can iterate it directly — iterating `[armour, accessories]` refs and
// reading `col.value` does not survive the OG render context.
const equipColumns = computed(() => [props.items.slice(0, 4), props.items.slice(4, 8)])
const weapon = computed(() => props.items[8] ?? null)

const panelStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column' as const,
  flex: 1,
  background: `linear-gradient(${C.ground}, ${classBg.value})`,
  border: `3px solid ${headColor.value}`,
  borderRadius: '10px',
  padding: '28px 40px',
  boxSizing: 'border-box' as const,
  color: C.text,
}))
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
    <div :style="panelStyle">
      <!-- Header: class weapon icon + headline + tags, wynn.tools mark right -->
      <div
        style="display: flex; align-items: center; justify-content: space-between;"
      >
        <div style="display: flex; align-items: center;">
          <img
            v-if="weaponIconUrl"
            :src="weaponIconUrl"
            width="56"
            height="56"
            :style="{ marginRight: '18px', objectFit: 'contain', imageRendering: 'pixelated' }"
            alt=""
          >
          <div style="display: flex; flex-direction: column;">
            <span
              :style="{
                display: 'flex',
                fontFamily: PIXEL,
                fontSize: '46px',
                lineHeight: 1,
                color: headColor,
                textShadow: '3px 3px 0 rgba(0,0,0,0.45)',
              }"
            >{{ headline }}</span>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <span
                :style="{
                  display: 'flex',
                  fontFamily: FIVE,
                  fontSize: '20px',
                  lineHeight: 1,
                  color: '#0c0e12',
                  background: headColor,
                  padding: '4px 10px',
                  borderRadius: '3px',
                }"
              >{{ className.toLowerCase() }}</span>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: FIVE,
                  fontSize: '20px',
                  lineHeight: 1,
                  color: '#0c0e12',
                  background: C.muted,
                  padding: '4px 10px',
                  borderRadius: '3px',
                }"
              >lv {{ level }}</span>
            </div>
          </div>
        </div>
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

      <div
        v-if="bylineText || tags.length"
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginTop: '14px',
          flexWrap: 'wrap',
        }"
      >
        <span
          v-if="bylineText"
          :style="{ display: 'flex', fontFamily: SANS, fontSize: '14px', color: C.muted }"
        >{{ bylineText }}</span>
        <span
          v-for="t in tags.slice(0, 3)"
          :key="t"
          :style="{
            display: 'flex',
            fontFamily: SANS,
            fontSize: '12px',
            color: headColor,
            padding: '3px 9px',
            border: `1px solid ${headColor}`,
            borderRadius: '99px',
          }"
        >{{ t }}</span>
      </div>

      <div
        :style="{
          display: 'flex',
          height: '2px',
          background: C.seam,
          margin: '18px 0',
        }"
      />

      <!-- Body: equipment grid (left) + combat & SP (right) -->
      <div style="display: flex; flex: 1;">
        <!-- LEFT: skill points above the equipment, mirroring the builder -->
        <div
          :style="{
            display: 'flex',
            flexDirection: 'column',
            width: '600px',
            paddingRight: '28px',
          }"
        >
          <!-- Skill points -->
          <div style="display: flex; gap: 18px; margin-bottom: 20px;">
            <div
              v-for="(c, i) in sp"
              :key="i"
              style="display: flex; flex-direction: column; align-items: center;"
            >
              <div
                style="display: flex; position: relative; width: 48px; height: 48px; align-items: center; justify-content: center;"
              >
                <img
                  :src="c.discUrl"
                  :style="{ position: 'absolute', top: '0', left: '0', width: '48px', height: '48px', imageRendering: 'pixelated' }"
                  alt=""
                >
                <img
                  :src="c.iconUrl"
                  width="26"
                  height="26"
                  :style="{ position: 'relative', objectFit: 'contain', imageRendering: 'pixelated' }"
                  :alt="c.skill"
                >
              </div>
              <span
                :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '16px', marginTop: '3px', color: c.active ? C.good : '#5c5c5c' }"
              >{{ c.value }}</span>
            </div>
          </div>

          <!-- Equipment grid -->
          <div style="display: flex;">
            <div
              v-for="(col, colIdx) in equipColumns"
              :key="colIdx"
              :style="{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                paddingLeft: colIdx === 1 ? '24px' : '0',
              }"
            >
              <div
                v-for="(item, rowIdx) in col"
                :key="item.slot"
                :style="{
                  display: 'flex',
                  alignItems: 'center',
                  height: '34px',
                  paddingTop: rowIdx === 0 ? '0' : '4px',
                  minWidth: 0,
                }"
              >
                <template v-if="item.name !== '—'">
                  <img
                    v-if="item.icon"
                    :src="item.icon"
                    width="26"
                    height="26"
                    :style="{ marginRight: '9px', objectFit: 'contain', imageRendering: 'pixelated' }"
                    alt=""
                  >
                  <span
                    :style="{
                      display: 'flex',
                      fontFamily: PIXEL,
                      fontSize: '21px',
                      lineHeight: 1.1,
                      color: rarityColor(item.tier),
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                    }"
                  >{{ item.name }}</span>
                  <span
                    v-if="item.powders"
                    :style="{
                      display: 'flex',
                      fontFamily: SANS,
                      fontSize: '12px',
                      color: C.faint,
                      marginLeft: '8px',
                    }"
                  >[{{ item.powders }}]</span>
                </template>
                <span
                  v-else
                  :style="{
                    display: 'flex',
                    fontFamily: SANS,
                    fontSize: '12px',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: C.faint,
                  }"
                >{{ item.slot }}</span>
              </div>
            </div>
          </div>
          <!-- Weapon spans the bottom of the equipment region -->
          <div
            v-if="weapon"
            :style="{
              display: 'flex',
              alignItems: 'center',
              height: '34px',
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: `1px solid ${C.seam}`,
            }"
          >
            <template v-if="weapon.name !== '—'">
              <img
                v-if="weapon.icon"
                :src="weapon.icon"
                width="26"
                height="26"
                :style="{ marginRight: '9px', objectFit: 'contain', imageRendering: 'pixelated' }"
                alt=""
              >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '21px',
                  lineHeight: 1.1,
                  color: rarityColor(weapon.tier),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }"
              >{{ weapon.name }}</span>
              <span
                v-if="weapon.powders"
                :style="{
                  display: 'flex',
                  fontFamily: SANS,
                  fontSize: '12px',
                  color: C.faint,
                  marginLeft: '8px',
                }"
              >[{{ weapon.powders }}]</span>
            </template>
            <span
              v-else
              :style="{
                display: 'flex',
                fontFamily: SANS,
                fontSize: '12px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: C.faint,
              }"
            >{{ weapon.slot }}</span>
          </div>
        </div>

        <!-- RIGHT: HP / EHP, defenses, combat output -->
        <div
          :style="{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingLeft: '28px',
            borderLeft: `1px solid ${C.seam}`,
          }"
        >
          <!-- Total HP + Effective HP -->
          <div style="display: flex; align-items: flex-end; gap: 40px;">
            <div style="display: flex; flex-direction: column;">
              <div style="display: flex; align-items: baseline;">
                <span :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '44px', lineHeight: 1, color: headColor }">{{ formatStat(ehp) }}</span>
                <span :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '22px', marginLeft: '10px', color: C.text }">EHP</span>
              </div>
              <span :style="{ display: 'flex', fontFamily: SANS, fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginTop: '4px' }">Effective HP</span>
            </div>
            <div style="display: flex; flex-direction: column;">
              <div style="display: flex; align-items: baseline;">
                <span :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '30px', lineHeight: 1, color: C.text }">{{ formatStat(totalHp) }}</span>
                <span :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '18px', marginLeft: '8px', color: C.muted }">HP</span>
              </div>
              <span :style="{ display: 'flex', fontFamily: SANS, fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginTop: '4px' }">Total HP</span>
            </div>
          </div>

          <!-- Elemental defenses (single line) -->
          <div
            v-if="elementalDefenses.length"
            style="display: flex; flex-wrap: nowrap; gap: 14px; margin-top: 22px;"
          >
            <span
              v-for="(d, i) in elementalDefenses"
              :key="i"
              style="display: flex; align-items: center;"
            >
              <img
                :src="d.iconUrl"
                width="20"
                height="20"
                :style="{ marginRight: '5px', objectFit: 'contain', imageRendering: 'pixelated' }"
                alt=""
              >
              <span
                :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '18px', whiteSpace: 'nowrap', color: d.positive ? C.good : C.bad }"
              >{{ d.value }}</span>
            </span>
          </div>

          <!-- Combat output: top damage lines -->
          <div
            v-if="combatLines.length"
            style="display: flex; flex-direction: column; margin-top: 24px;"
          >
            <span
              :style="{ display: 'flex', fontFamily: SANS, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }"
            >Combat Output</span>
            <div
              v-for="(line, i) in combatLines"
              :key="i"
              style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 7px;"
            >
              <span
                :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '22px', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }"
              >{{ line.name }}</span>
              <span
                :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '22px', color: headColor, marginLeft: '16px' }"
              >{{ formatStat(line.dps) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
