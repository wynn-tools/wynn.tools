<script setup lang="ts">
defineProps<{
  accent: string
  path?: string
}>()
</script>

<template>
  <div class="tw" data-export-footer>
    <span>wynn<span :style="{ color: accent }">.</span>tools<template v-if="path">/{{ path }}</template></span>
  </div>
</template>

<style scoped>
.tw {
  display: none;
  justify-content: center;
  margin-top: 14px;
  font-family: 'wynncraft', var(--font-mono);
  font-size: 14px;
  letter-spacing: -1px;
  color: #5c5c5c;
}
</style>
