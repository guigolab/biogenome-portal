/**
 * `footer.logoUrl` from portal.json: path under `public/` (with or without leading `/`).
 * Use `footerLogoSrcWithBasePath` / `metadataFaviconIcon` so `<img src>` and `<link rel="icon">`
 * match when `NEXT_PUBLIC_BASE_PATH` / `basePath` is set.
 */
export function normalizeFooterLogoPublicPath(logoUrl: string | undefined): string | null {
   const trimmed = logoUrl?.trim()
   if (!trimmed) return null
   return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** Absolute path for `<img src>` when the app uses `NEXT_PUBLIC_BASE_PATH` / `basePath`. */
export function footerLogoSrcWithBasePath(logoUrl: string | undefined): string {
   const path = normalizeFooterLogoPublicPath(logoUrl)
   if (!path) return ''
   const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
   return bp ? `${bp}${path}` : path
}

/** For `<link rel="icon">` `type` when the URL points at a file under `public/`. */
export function faviconMimeTypeForPublicPath(publicPath: string): string | undefined {
   const lower = publicPath.toLowerCase()
   if (lower.endsWith('.svg')) return 'image/svg+xml'
   if (lower.endsWith('.png')) return 'image/png'
   if (lower.endsWith('.ico')) return 'image/x-icon'
   if (lower.endsWith('.webp')) return 'image/webp'
   if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
   return undefined
}

/** `generateMetadata` icons: same resolved URL as `footerLogoSrcWithBasePath` in the nav bar. */
export function metadataFaviconIcon(footerLogoUrl: string | undefined): {
   url: string
   type?: string
} {
   const normalized = normalizeFooterLogoPublicPath(footerLogoUrl)
   const url = normalized
      ? footerLogoSrcWithBasePath(footerLogoUrl)
      : footerLogoSrcWithBasePath('/icon.svg')
   const mimePath = normalized ?? '/icon.svg'
   const type = faviconMimeTypeForPublicPath(mimePath)
   return type ? { url, type } : { url }
}
