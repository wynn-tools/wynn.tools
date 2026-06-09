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
  const copying = ref(false)
  const copied = ref(false)
  const toast = useToast()

  async function renderBlob(el: HTMLElement): Promise<Blob | null> {
    const footer = el.querySelector<HTMLElement>('[data-export-footer]')
    const prevDisplay = footer?.style.display ?? ''
    if (footer)
      footer.style.display = 'flex'
    el.classList.add('is-exporting')
    const restoreBorders = await inlineBorderImages(el)
    try {
      await document.fonts.ready
      return await toBlob(el, {
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => {
          if (!(node instanceof HTMLElement))
            return true
          return !node.hasAttribute('data-export-ignore')
        },
      })
    }
    finally {
      restoreBorders()
      el.classList.remove('is-exporting')
      if (footer)
        footer.style.display = prevDisplay
    }
  }

  async function exportTooltip(el: HTMLElement, filename: string): Promise<void> {
    if (!el.isConnected || exporting.value || copying.value)
      return
    exporting.value = true
    try {
      const blob = await renderBlob(el)
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
      exporting.value = false
    }
  }

  async function copyTooltip(el: HTMLElement): Promise<void> {
    if (!el.isConnected || exporting.value || copying.value)
      return
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      toast.push('error', 'Clipboard images aren\'t supported in this browser.')
      return
    }
    copying.value = true
    try {
      const blob = await renderBlob(el)
      if (!blob)
        throw new Error('html-to-image returned a null blob')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 1500)
    }
    catch (err) {
      console.error('[tooltip-export] copy failed:', err)
      toast.push('error', 'Couldn\'t copy image — try again.')
    }
    finally {
      copying.value = false
    }
  }

  return { exporting, copying, copied, exportTooltip, copyTooltip }
}
