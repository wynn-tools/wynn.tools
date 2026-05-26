import { ref } from 'vue'

interface Toast { id: number, kind: 'info' | 'error', msg: string }
const toasts = ref<Toast[]>([])
let next = 0

export function useToast() {
  function push(kind: Toast['kind'], msg: string, ttl = 4000) {
    const id = next++
    toasts.value.push({ id, kind, msg })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, ttl)
  }
  return { toasts, push }
}
