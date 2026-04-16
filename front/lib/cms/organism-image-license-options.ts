/**
 * License options for the organism image form.
 * The image-fetch job normalizes allowlisted licenses to these values
 * (see `normalize_license_to_portal_canonical` in organism_images_fetch.py).
 */
export type ImageLicenseOption = {
   label: string
   value: string
   license_url: string
}

export const IMAGE_LICENSE_OPTIONS: ImageLicenseOption[] = [
   {
      label: 'CC0 1.0 — No Rights Reserved',
      value: 'CC0-1.0',
      license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
   },
   {
      label: 'Public Domain',
      value: 'public_domain',
      license_url: 'https://creativecommons.org/publicdomain/mark/1.0/',
   },
   {
      label: 'CC BY 4.0 — Attribution',
      value: 'CC-BY-4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
   },
   {
      label: 'CC BY 3.0 — Attribution',
      value: 'CC-BY-3.0',
      license_url: 'https://creativecommons.org/licenses/by/3.0/',
   },
   {
      label: 'CC BY 2.0 — Attribution',
      value: 'CC-BY-2.0',
      license_url: 'https://creativecommons.org/licenses/by/2.0/',
   },
   {
      label: 'CC BY-SA 4.0 — Attribution-ShareAlike',
      value: 'CC-BY-SA-4.0',
      license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
   },
   {
      label: 'CC BY-SA 3.0 — Attribution-ShareAlike',
      value: 'CC-BY-SA-3.0',
      license_url: 'https://creativecommons.org/licenses/by-sa/3.0/',
   },
   {
      label: 'CC BY-SA 2.0 — Attribution-ShareAlike',
      value: 'CC-BY-SA-2.0',
      license_url: 'https://creativecommons.org/licenses/by-sa/2.0/',
   },
]

const CANONICAL_LICENSE_VALUES = new Set(IMAGE_LICENSE_OPTIONS.map((o) => o.value))

/**
 * Map API / legacy image-fetch labels (e.g. `CC0`, `CC-BY`) to the dropdown's
 * canonical values so the license Select shows the correct option.
 */
export function normalizeOrganismImageLicenseFromApi<T extends { license: string; license_url?: string }>(
   row: T,
): T {
   const lic = (row.license || '').trim()
   if (CANONICAL_LICENSE_VALUES.has(lic)) return row

   const url = (row.license_url || '').trim()

   if (url && /creativecommons\.org/i.test(url)) {
      const bySa = url.match(/creativecommons\.org\/licenses\/by-sa\/([\d.]+)/i)
      if (bySa) {
         const canon = `CC-BY-SA-${bySa[1]}`
         if (CANONICAL_LICENSE_VALUES.has(canon)) {
            return { ...row, license: canon, license_url: url }
         }
      }
      const byOnly = url.match(/creativecommons\.org\/licenses\/by\/([\d.]+)/i)
      if (byOnly && !/by-sa/i.test(url)) {
         const canon = `CC-BY-${byOnly[1]}`
         if (CANONICAL_LICENSE_VALUES.has(canon)) {
            return { ...row, license: canon, license_url: url }
         }
      }
      if (/publicdomain\/zero/i.test(url)) {
         return {
            ...row,
            license: 'CC0-1.0',
            license_url: url || IMAGE_LICENSE_OPTIONS[0].license_url,
         }
      }
   }

   if (lic === 'CC0') {
      return {
         ...row,
         license: 'CC0-1.0',
         license_url: url || IMAGE_LICENSE_OPTIONS[0].license_url,
      }
   }
   if (lic === 'CC-BY') {
      const opt = IMAGE_LICENSE_OPTIONS.find((o) => o.value === 'CC-BY-4.0')
      return {
         ...row,
         license: 'CC-BY-4.0',
         license_url: url || opt?.license_url || '',
      }
   }
   if (lic === 'CC-BY-SA') {
      const opt = IMAGE_LICENSE_OPTIONS.find((o) => o.value === 'CC-BY-SA-4.0')
      return {
         ...row,
         license: 'CC-BY-SA-4.0',
         license_url: url || opt?.license_url || '',
      }
   }

   return row
}
