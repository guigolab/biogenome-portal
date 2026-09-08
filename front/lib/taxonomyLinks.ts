/** Deep-link to taxonomy explorer at selected taxon. */
export function taxonomyTaxonHref(taxid: string): string {
   const id = String(taxid ?? '').trim()
   if (!id) return '/taxonomy'
   return `/taxonomy?taxid=${encodeURIComponent(id)}`
}

/** Deep-link to catalog explorer, scoped to this taxon (`tid` query param). */
export function catalogTaxonHref(taxid: string): string {
   const id = String(taxid ?? '').trim()
   if (!id) return '/catalog'
   return `/catalog?tid=${encodeURIComponent(id)}`
}
