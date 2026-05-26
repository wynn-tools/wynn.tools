<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed bottom-20 left-1/2 z-[1000] -translate-x-1/2 space-y-2">
      <TransitionGroup
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto rounded-md px-4 py-2 text-sm shadow-lg backdrop-blur"
          :class="
            t.kind === 'error'
              ? 'bg-red-500/90 text-white'
              : 'bg-bg/90 text-copper ring-1 ring-copper/20'
          "
        >
          {{ t.msg }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
