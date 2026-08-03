// View Transitions API helpers for animated theme changes (clip-path circle reveal).

export type ThemeTransitionOrigin = Element | { x: number, y: number }

export interface ThemeTransitionOptions {
  duration?: number
  /** Click target or explicit coordinates; defaults to viewport center. */
  origin?: ThemeTransitionOrigin
}

function transitionOrigin(
  options: ThemeTransitionOptions | undefined,
  viewportWidth: number,
  viewportHeight: number,
): { x: number, y: number } {
  const origin = options?.origin
  if (origin && 'x' in origin)
    return origin

  if (origin instanceof Element) {
    const { top, left, width, height } = origin.getBoundingClientRect()
    return { x: left + width / 2, y: top + height / 2 }
  }

  return { x: viewportWidth / 2, y: viewportHeight / 2 }
}

/** Run `apply` inside a clip-path view transition, or call it immediately when unsupported. */
export function runThemeTransition(apply: () => void, options?: ThemeTransitionOptions): void {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') {
    apply()
    return
  }

  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    apply()
    return
  }

  const duration = options?.duration ?? 400

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const { x, y } = transitionOrigin(options, viewportWidth, viewportHeight)

  const maxRadius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y),
  )

  const clipPath: [string, string] = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${maxRadius}px at ${x}px ${y}px)`,
  ]

  const root = document.documentElement
  root.dataset.wynnThemeVt = 'active'
  root.style.setProperty('--wynn-theme-vt-duration', `${duration}ms`)
  // Pin collapsed clip-path so Firefox does not flash the new theme unclipped
  // between snapshot and the ready.then() JS animation.
  root.style.setProperty('--wynn-theme-vt-clip-from', clipPath[0])

  const cleanup = () => {
    delete root.dataset.wynnThemeVt
    root.style.removeProperty('--wynn-theme-vt-duration')
    root.style.removeProperty('--wynn-theme-vt-clip-from')
  }

  const transition = document.startViewTransition(apply)

  if (typeof transition?.finished?.finally === 'function')
    transition.finished.finally(cleanup)
  else
    cleanup()

  transition?.ready?.then?.(() => {
    document.documentElement.animate(
      { clipPath },
      {
        duration,
        easing: 'ease-in-out',
        fill: 'forwards',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })
}
