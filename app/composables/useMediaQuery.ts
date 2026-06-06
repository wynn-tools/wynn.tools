import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mq: MediaQueryList | null = null

  function update(e: MediaQueryListEvent | MediaQueryList) {
    matches.value = e.matches
  }

  onMounted(() => {
    mq = window.matchMedia(query)
    update(mq)
    mq.addEventListener('change', update)
  })

  onBeforeUnmount(() => {
    if (mq)
      mq.removeEventListener('change', update)
  })

  return matches
}
