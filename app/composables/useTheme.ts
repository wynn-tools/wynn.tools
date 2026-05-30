// Appearance theme: a stored preference (which may be 'system') resolved to a
// concrete theme applied as html[data-theme]. The CSS in global.css owns the
// actual colors; this only persists the choice and keeps the attribute in sync.

export type ThemePref = 'system' | 'light' | 'dark' | 'midnight'
export type ResolvedTheme = 'light' | 'dark' | 'midnight'

export const THEME_OPTIONS: { value: ThemePref, label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'midnight', label: 'Midnight' },
]

const LS_KEY = 'wynn:theme'

// Module-level singletons so every caller shares one source of truth.
const pref = ref<ThemePref>('dark')
const resolved = ref<ResolvedTheme>('dark')
let initialized = false

function systemTheme(): ResolvedTheme {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(p: ThemePref): ResolvedTheme {
  return p === 'system' ? systemTheme() : p
}

function apply(p: ThemePref) {
  resolved.value = resolve(p)
  document.documentElement.dataset.theme = resolved.value
}

export function useTheme() {
  function init() {
    if (initialized)
      return
    initialized = true

    try {
      const saved = localStorage.getItem(LS_KEY) as ThemePref | null
      if (saved && THEME_OPTIONS.some(o => o.value === saved))
        pref.value = saved
    }
    catch {}

    apply(pref.value)

    // React to OS scheme changes while following the system preference.
    globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (pref.value === 'system')
        apply('system')
    })
  }

  function setTheme(p: ThemePref) {
    pref.value = p
    try {
      localStorage.setItem(LS_KEY, p)
    }
    catch {}
    apply(p)
  }

  return {
    pref: readonly(pref),
    resolved: readonly(resolved),
    init,
    setTheme,
  }
}
