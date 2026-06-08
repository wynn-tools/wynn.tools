<script setup lang="ts">
defineProps<{ title: string, message: string }>()
</script>

<template>
  <div class="tt-wrap">
    <div class="tt-container">
      <div class="tt-frame" />
      <div class="tt-inner">
        <header class="tt-header">
          <span class="tt-name">{{ title }}</span>
        </header>
        <p class="tt-error-message">
          {{ message }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tt-wrap {
  position: relative;
  width: 100%;
  max-width: 482px;
}
.tt-container {
  position: relative;
  width: 100%;
  font-family: 'wynncraft', var(--font-mono);
  letter-spacing: -1px;
  overflow: hidden;
  background: #0d0d0d;
}
.tt-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 2px solid var(--color-border);
  pointer-events: none;
  z-index: 1;
}
.tt-inner {
  position: relative;
  padding: 26px 20px 16px;
  min-height: 100px;
  color: #fcfcfc;
}
.tt-header {
  margin-bottom: 8px;
}
.tt-name {
  font-size: 24px;
  line-height: 1;
  color: #ffffff;
}
.tt-error-message {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  padding: 0.5rem 0;
  letter-spacing: 0;
}

@media (max-width: 480px) {
  .tt-inner {
    padding: 22px 14px 14px;
  }
  .tt-name {
    font-size: 18px;
  }
}
</style>
