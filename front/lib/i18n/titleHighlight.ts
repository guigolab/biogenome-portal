/**
 * Split `title` around the first case-insensitive occurrence of `highlight`.
 * Returns null if `highlight` is empty or not found.
 */
export function splitTitleForHighlight(
   title: string,
   highlight: string,
): { before: string; hit: string; after: string } | null {
   const needle = highlight.trim()
   if (!needle) return null
   const lowerTitle = title.toLowerCase()
   const lowerNeedle = needle.toLowerCase()
   const idx = lowerTitle.indexOf(lowerNeedle)
   if (idx < 0) return null
   return {
      before: title.slice(0, idx),
      hit: title.slice(idx, idx + needle.length),
      after: title.slice(idx + needle.length),
   }
}
