/**
 * Derive a human-facing source record URL from a direct image/file URL.
 * Mirrors patterns used in organism_images_fetch.py (Commons file pages, Zenodo records, GBIF occurrences).
 * Falls back to the parent path with the filename segment removed when no known host pattern matches.
 */

const IMAGE_FILE_EXT = /\.(jpe?g|png|gif|webp|svg|tiff?|bmp|avif|heic)$/i

function wikimediaFilePage(project: string, filename: string): string {
   const title = filename.replace(/ /g, '_')
   if (project === 'commons') {
      return `https://commons.wikimedia.org/wiki/File:${title}`
   }
   return `https://${project}.wikipedia.org/wiki/File:${title}`
}

function inferWikimediaUploadSource(url: URL): string | null {
   const path = decodeURIComponent(url.pathname)

   const thumbMatch = path.match(/^\/wikipedia\/([^/]+)\/thumb\/(?:[^/]+\/){2}([^/]+)\/\d+px-[^/]+$/i)
   if (thumbMatch) {
      return wikimediaFilePage(thumbMatch[1], thumbMatch[2])
   }

   const fileMatch = path.match(/^\/wikipedia\/([^/]+)\/(?:[^/]+\/){2}([^/]+)$/i)
   if (fileMatch) {
      return wikimediaFilePage(fileMatch[1], fileMatch[2])
   }

   return null
}

function inferZenodoSource(url: URL): string | null {
   if (!url.hostname.toLowerCase().includes('zenodo.org')) return null
   const match = url.pathname.match(/\/(?:api\/)?records?\/(\d+)/i)
   if (!match) return null
   return `https://zenodo.org/records/${match[1]}`
}

function inferGbifSource(url: URL): string | null {
   const host = url.hostname.toLowerCase()
   if (!host.includes('gbif.org')) return null
   const match = url.pathname.match(/\/occurrence\/(\d+)/i)
   if (!match) return null
   return `https://www.gbif.org/occurrence/${match[1]}`
}

function inferInaturalistSource(url: URL): string | null {
   const host = url.hostname.toLowerCase()
   const path = url.pathname
   if (host.includes('inaturalist.org')) {
      const obs = path.match(/\/observations\/(\d+)/i)
      if (obs) return `https://www.inaturalist.org/observations/${obs[1]}`
   }
   if (
      host.includes('inaturalist.org') ||
      host.includes('inaturalist-open-data') ||
      host.includes('inaturalist')
   ) {
      const photo = path.match(/\/photos\/(\d+)/i)
      if (photo) return `https://www.inaturalist.org/photos/${photo[1]}`
   }
   return null
}

/** Keep a Commons/Wikipedia File: page as the source when pasted as the image URL. */
function inferWikiFilePage(url: URL): string | null {
   const host = url.hostname.toLowerCase()
   if (host !== 'commons.wikimedia.org' && !host.endsWith('.wikipedia.org')) return null
   if (!/\/wiki\/File:/i.test(decodeURIComponent(url.pathname))) return null
   return `${url.origin}${url.pathname}`
}

/** Parent URL with the last path segment removed when it looks like a file name. */
function stripFilenameFromUrl(url: URL): string | null {
   const segments = decodeURIComponent(url.pathname)
      .split('/')
      .filter(Boolean)
   if (segments.length === 0) return null

   const last = segments[segments.length - 1]
   const looksLikeFile =
      IMAGE_FILE_EXT.test(last) || (last.includes('.') && !last.endsWith('.'))
   if (!looksLikeFile) return null

   if (segments.length === 1) return `${url.origin}/`

   return `${url.origin}/${segments.slice(0, -1).join('/')}`
}

/** Return a source record URL inferred from ``imageUrl``, or null if unknown. */
export function inferSourceRecordUrlFromImageUrl(imageUrl: string): string | null {
   const trimmed = imageUrl.trim()
   if (!trimmed) return null

   let url: URL
   try {
      url = new URL(trimmed)
   } catch {
      return null
   }

   if (url.hostname.toLowerCase() === 'upload.wikimedia.org') {
      return inferWikimediaUploadSource(url) ?? stripFilenameFromUrl(url) ?? url.origin
   }

   return (
      inferWikiFilePage(url) ??
      inferZenodoSource(url) ??
      inferGbifSource(url) ??
      inferInaturalistSource(url) ??
      stripFilenameFromUrl(url) ??
      url.origin
   )
}

/** Always set source_record_url from the image URL (the field is not user-editable). */
export function patchImageRowForUrlChange(
   _current: { url: string; source_record_url: string },
   nextUrl: string,
): { url: string; source_record_url: string } {
   return {
      url: nextUrl,
      source_record_url: inferSourceRecordUrlFromImageUrl(nextUrl) ?? '',
   }
}

/** Fill an empty source_record_url from the image URL (e.g. rows loaded from the API). */
export function withInferredSourceRecordUrl<T extends { url: string; source_record_url: string }>(row: T): T {
   if (row.source_record_url?.trim()) return row
   const inferred = inferSourceRecordUrlFromImageUrl(row.url)
   if (!inferred) return row
   return { ...row, source_record_url: inferred }
}
