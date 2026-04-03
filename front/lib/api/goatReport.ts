import { getApiBase } from '@/lib/api/taxon'

function filenameFromContentDisposition(header: string | null): string | null {
   if (!header) return null
   const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header)
   if (!m) return null
   try {
      return decodeURIComponent(m[1].trim())
   } catch {
      return m[1].trim()
   }
}

export type GoatReportDownload = { blob: Blob; filename: string }

/**
 * GET /goat_report — streamed TSV (requires GOAT_PROJECT_NAME on server).
 */
export async function downloadGoatReport(): Promise<GoatReportDownload> {
   const base = getApiBase()
   const url = `${base}/goat_report`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'text/tab-separated-values,*/*' },
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || `goat_report: ${res.status} ${res.statusText}`)
   }
   const blob = await res.blob()
   const fromHeader = filenameFromContentDisposition(res.headers.get('content-disposition'))
   const filename = fromHeader || 'goat_report.tsv'
   return { blob, filename }
}
