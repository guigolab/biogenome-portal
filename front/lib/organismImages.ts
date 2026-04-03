/**
 * Resolve image URLs from an organism list row or API document (parity with Vue useOrganismImages).
 */
export function organismImageUrls(item: Record<string, unknown> | null | undefined): string[] {
   if (!item) return []
   const imgs: string[] = []
   const push = (u: string) => {
      if (u && !imgs.includes(u)) imgs.push(u)
   }

   const avatar = item.avatar
   if (typeof avatar === 'string' && avatar) push(avatar)

   const image = item.image
   if (typeof image === 'string' && image) push(image)

   const imageUrls = item.image_urls
   if (Array.isArray(imageUrls)) {
      for (const url of imageUrls) {
         if (typeof url === 'string' && url) push(url)
      }
   }

   const images = item.images
   if (Array.isArray(images)) {
      for (const el of images) {
         if (typeof el === 'string' && el) push(el)
         else if (el && typeof el === 'object' && 'url' in el) {
            const u = (el as { url?: unknown }).url
            if (typeof u === 'string' && u) push(u)
         }
      }
   }

   return imgs
}
