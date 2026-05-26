<script setup lang="ts">
const props = defineProps<{
  level: number
  className: string
  items: Array<{ slot: string, name: string }>
  dps: number
  ehp: number
}>()

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}
</script>

<template>
  <div
    style="display: flex; flex-direction: column; width: 100%; height: 100%;
           background: #0f1117; padding: 48px; font-family: 'Geist', sans-serif; box-sizing: border-box;"
  >
    <!-- Header -->
    <div
      style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; margin-bottom: 36px;"
    >
      <div style="color: #ffffff; font-size: 52px; font-weight: 700; line-height: 1.1;">
        Level {{ props.level }} {{ props.className }}
      </div>
      <div style="color: #6b7280; font-size: 22px; padding-top: 8px;">
        wynn.tools
      </div>
    </div>

    <!-- Item list -->
    <div style="display: flex; flex-direction: column; flex: 1; gap: 10px;">
      <div
        v-for="item in props.items"
        :key="item.slot"
        style="display: flex; flex-direction: row; justify-content: space-between; align-items: center;"
      >
        <span style="color: #6b7280; font-size: 21px; width: 130px;">{{ item.slot }}</span>
        <span style="color: #ffffff; font-size: 21px; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">{{ item.name }}</span>
      </div>
    </div>

    <!-- Stat bar -->
    <div style="display: flex; flex-direction: row; gap: 16px; margin-top: 36px;">
      <div
        style="display: flex; flex-direction: row; align-items: center; padding: 12px 24px; background: #1f2937; border-radius: 8px;"
      >
        <span style="color: #3b82f6; font-size: 20px; font-weight: 600; margin-right: 10px;">DPS</span>
        <span style="color: #ffffff; font-size: 20px;">{{ formatNumber(props.dps) }}</span>
      </div>
      <div
        style="display: flex; flex-direction: row; align-items: center; padding: 12px 24px; background: #1f2937; border-radius: 8px;"
      >
        <span style="color: #3b82f6; font-size: 20px; font-weight: 600; margin-right: 10px;">EHP</span>
        <span style="color: #ffffff; font-size: 20px;">{{ formatNumber(props.ehp) }}</span>
      </div>
    </div>
  </div>
</template>
