/**
 * `footer.logoUrl` from portal.json: filename (or public-style path like `/CBPLogo.png`).
 * Resolved through the backend's `GET /api/portal/assets/<filename>` so logos follow the same
 * path as portal config and no longer need to be bind-mounted into Next `public/`.
 * See front-config-centralization-plan.md Phase 4.
 *
 * Bundled fallback favicon (`/icon.svg`) stays a Next `public/` path — only real `logoUrl`
 * values go through the asset endpoint.
 */

/** Filename from `footer.logoUrl` (strips leading path segments). */
export function normalizeFooterLogoPublicPath(logoUrl: string | undefined): string | null {
   const trimmed = logoUrl?.trim()
   if (!trimmed) return null
   const filename = trimmed.split('/').filter(Boolean).pop()
   return filename ? `/${filename}` : null
}

/**
 * Relative URL for `<img src>` / favicon when a portal `logoUrl` is set.
 * Goes through `${basePath}/api/portal/assets/<filename>` (Flask via the edge proxy).
 */
export function footerLogoSrcWithBasePath(logoUrl: string | undefined): string {
   const trimmed = logoUrl?.trim()
   if (!trimmed) return ''
   const filename = trimmed.split('/').filter(Boolean).pop()
   if (!filename) return ''
   const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
   return `${bp}/api/portal/assets/${encodeURIComponent(filename)}`
}

/** Bundled default favicon under Next `public/` (with basePath when set). */
function bundledIconSrc(): string {
   const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
   return bp ? `${bp}/icon.svg` : '/icon.svg'
}

/** For `<link rel="icon">` `type` when the URL points at a known image extension. */
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
   if (normalized) {
      const url = footerLogoSrcWithBasePath(footerLogoUrl)
      const type = faviconMimeTypeForPublicPath(normalized)
      return type ? { url, type } : { url }
   }
   const url = bundledIconSrc()
   return { url, type: 'image/svg+xml' }
}
