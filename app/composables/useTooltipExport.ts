import { toBlob } from 'html-to-image'
import { ref } from 'vue'

async function fetchAsDataUri(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors', cache: 'force-cache' })
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error ?? new Error('FileReader failed'))
    r.readAsDataURL(blob)
  })
}

async function inlineBorderImages(root: HTMLElement): Promise<() => void> {
  const restores: Array<() => void> = []
  const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
  for (const node of all) {
    const src = getComputedStyle(node).borderImageSource
    if (!src || src === 'none')
      continue
    const m = src.match(/url\(["']?([^"')]+)["']?\)/)
    if (!m || m[1].startsWith('data:'))
      continue
    try {
      const dataUri = await fetchAsDataUri(m[1])
      const prev = node.style.borderImageSource
      node.style.borderImageSource = `url("${dataUri}")`
      restores.push(() => {
        node.style.borderImageSource = prev
      })
    }
    catch {}
  }
  return () => {
    for (const r of restores)
      r()
  }
}

export function useTooltipExport() {
  const exporting = ref(false)
  const toast = useToast()

  async function exportTooltip(el: HTMLElement, filename: string): Promise<void> {
    if (!el.isConnected)
      return
    if (exporting.value)
      return

    exporting.value = true
    const footer = el.querySelector<HTMLElement>('[data-export-footer]')
    const prevDisplay = footer?.style.display ?? ''
    if (footer)
      footer.style.display = 'flex'
    el.classList.add('is-exporting')
    const restoreBorders = await inlineBorderImages(el)

    try {
      await document.fonts.ready
      const blob = await toBlob(el, {
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => {
          if (!(node instanceof HTMLElement))
            return true
          return !node.hasAttribute('data-export-ignore')
        },
      })
      if (!blob)
        throw new Error('html-to-image returned a null blob')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
    catch (err) {
      console.error('[tooltip-export] failed:', err)
      toast.push('error', 'Couldn\'t export image — try again.')
    }
    finally {
      restoreBorders()
      el.classList.remove('is-exporting')
      if (footer)
        footer.style.display = prevDisplay
      exporting.value = false
    }
  }

  return { exporting, exportTooltip }
}
