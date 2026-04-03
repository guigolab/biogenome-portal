import { readFile } from 'fs/promises'
import path from 'path'
import { cache } from 'react'

import type { PortalConfig } from './types'

/** Server-only: read bundled/mounted `public/portal.json` (same file the client fetches). */
export const loadPortalConfigFromDisk = cache(async (): Promise<PortalConfig | null> => {
   try {
      const fp = path.join(process.cwd(), 'public', 'portal.json')
      const text = await readFile(fp, 'utf-8')
      return JSON.parse(text) as PortalConfig
   } catch {
      return null
   }
})
