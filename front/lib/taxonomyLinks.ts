/** Deep-link to taxonomy explorer at selected taxon. */
export function taxonomyTaxonHref(taxid: string): string {
   const id = String(taxid ?? '').trim()
   if (!id) return '/taxonomy'
   return `/taxonomy?taxid=${encodeURIComponent(id)}`
}

/** Deep-link to catalog explorer (portal root scope; taxon argument ignored). */
export function catalogTaxonHref(_taxid: string): string {
   return '/catalog'
}
