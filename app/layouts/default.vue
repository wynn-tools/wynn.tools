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
  max-width: var(--shell-max);
  margin: 0 auto;
  padding: 0 40px;
}

/* Phones keep a tight 14px gutter so text-content pages (Items, Builds, Profile,
   Changelog) don't slam against the screen edge. Width-hungry tool workspaces
   break out of this gutter to run edge to edge (see the −14px breakout in their
   own styles). Single source for that value below. */
@media (max-width: 600px) {
  .page-shell {
    padding: 0 var(--shell-pad-mobile, 14px);
  }
}
</style>
