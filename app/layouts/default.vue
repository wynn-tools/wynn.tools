<template>
  <AppNav />
  <div class="page-shell">
    <slot />
  </div>
</template>

<style scoped>
.page-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 40px;
}

@media (max-width: 600px) {
  .page-shell {
    padding: 0 20px;
  }
}
</style>
