/**
 * Export a Recharts-rendered SVG from a container (clone + inline computed styles for CSS variables).
 */

function triggerBlobDownload(blob: Blob, filename: string) {
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = filename
   a.rel = 'noopener'
   document.body.appendChild(a)
   a.click()
   a.remove()
   URL.revokeObjectURL(url)
}

export function findRechartsSvg(container: HTMLElement | null): SVGSVGElement | null {
   if (!container) return null
   const byClass = container.querySelector('svg.recharts-surface')
   if (byClass instanceof SVGSVGElement) return byClass
   const any = container.querySelector('svg')
   return any instanceof SVGSVGElement ? any : null
}

/**
 * Deep-clone the SVG and copy resolved fill/stroke/text styles so exports work outside the page CSS.
 */
function prepareSvgForExport(source: SVGSVGElement): SVGSVGElement {
   const clone = source.cloneNode(true) as SVGSVGElement
   if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
   }

   const srcNodes: Element[] = [source, ...source.querySelectorAll('*')]
   const dstNodes: Element[] = [clone, ...clone.querySelectorAll('*')]
   const n = Math.min(srcNodes.length, dstNodes.length)

   for (let i = 0; i < n; i++) {
      const src = srcNodes[i]!
      const dst = dstNodes[i]!
      const cs = getComputedStyle(src)
      const tag = dst.tagName.toLowerCase()

      if (tag === 'stop') {
         dst.setAttribute('stop-color', cs.stopColor)
         if (cs.stopOpacity && cs.stopOpacity !== '1') {
            dst.setAttribute('stop-opacity', cs.stopOpacity)
         }
         continue
      }

      if (dst instanceof SVGElement) {
         const fill = cs.fill
         if (fill && fill !== 'none') {
            if (fill.startsWith('url(')) {
               /* gradient / pattern refs stay in cloned defs */
            } else {
               dst.setAttribute('fill', fill)
            }
         }
         const stroke = cs.stroke
         if (stroke && stroke !== 'none') {
            dst.setAttribute('stroke', stroke)
         }
         if (cs.strokeWidth && cs.strokeWidth !== '0px') {
            dst.setAttribute('stroke-width', cs.strokeWidth)
         }
         if (tag === 'text') {
            dst.setAttribute('fill', cs.fill)
            dst.setAttribute('font-family', cs.fontFamily)
            dst.setAttribute('font-size', cs.fontSize)
            if (cs.fontWeight) dst.setAttribute('font-weight', cs.fontWeight)
         }
      }
   }

   return clone
}

export function downloadChartSvg(container: HTMLElement | null, filename: string): boolean {
   const svg = findRechartsSvg(container)
   if (!svg) return false
   const clone = prepareSvgForExport(svg)
   const serialized = new XMLSerializer().serializeToString(clone)
   const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
   triggerBlobDownload(blob, filename.endsWith('.svg') ? filename : `${filename}.svg`)
   return true
}

export function downloadChartPng(
   container: HTMLElement | null,
   filename: string,
   options?: { scale?: number },
): Promise<boolean> {
   const scale = options?.scale ?? 2
   const svg = findRechartsSvg(container)
   if (!svg) return Promise.resolve(false)

   const clone = prepareSvgForExport(svg)
   const rect = svg.getBoundingClientRect()
   const w = Math.max(1, Math.round(rect.width * scale))
   const h = Math.max(1, Math.round(rect.height * scale))
   clone.setAttribute('width', String(w))
   clone.setAttribute('height', String(h))

   const serialized = new XMLSerializer().serializeToString(clone)
   const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`

   return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
         try {
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            if (!ctx) {
               resolve(false)
               return
            }
            const bg = getComputedStyle(document.documentElement).backgroundColor
            ctx.fillStyle = bg && bg !== 'transparent' ? bg : '#ffffff'
            ctx.fillRect(0, 0, w, h)
            ctx.drawImage(img, 0, 0, w, h)
            canvas.toBlob(
               (blob) => {
                  if (!blob) {
                     resolve(false)
                     return
                  }
                  triggerBlobDownload(blob, filename.endsWith('.png') ? filename : `${filename}.png`)
                  resolve(true)
               },
               'image/png',
               1,
            )
         } catch {
            resolve(false)
         }
      }
      img.onerror = () => resolve(false)
      img.src = dataUrl
   })
}
