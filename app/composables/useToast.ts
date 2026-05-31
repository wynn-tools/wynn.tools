import { ref } from 'vue'

export interface ToastAction { label: string, run: () => void }
interface Toast { id: number, kind: 'info' | 'error', msg: string, action?: ToastAction }
const toasts = ref<Toast[]>([])
let next = 0

export function useToast() {
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  function push(kind: Toast['kind'], msg: string, ttl = 4000) {
    const id = next++
    toasts.value.push({ id, kind, msg })
    setTimeout(dismiss, ttl, id)
  }
  /** Push a toast carrying a one-tap action (e.g. Undo). Runs once, then dismisses. */
  function pushAction(kind: Toast['kind'], msg: string, action: ToastAction, ttl = 6000) {
    const id = next++
    toasts.value.push({
      id,
      kind,
      msg,
      action: {
        label: action.label,
        run: () => {
          action.run()
          dismiss(id)
        },
      },
    })
    setTimeout(dismiss, ttl, id)
  }
  return { toasts, push, pushAction, dismiss }
}
