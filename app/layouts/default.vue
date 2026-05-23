<template>
  <div class="layout">
    <slot />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0 40px;
}

@media (max-width: 480px) {
  .layout { padding: 0 24px; }
}
</style>
