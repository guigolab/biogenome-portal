import type { LucideIcon } from 'lucide-react'
import {
   Activity,
   FolderTree,
   Home,
   LayoutDashboard,
   Leaf,
   LogIn,
   Map,
   ScanLine,
   TableProperties,
} from 'lucide-react'

/** Lucide icons for main nav routes; reuse in page headers for visual consistency. */
export const navRouteIcons = {
   home: Home,
   map: Map,
   taxonomy: FolderTree,
   species: Leaf,
   catalog: TableProperties,
   genomeBrowser: ScanLine,
   status: Activity,
   login: LogIn,
   myArea: LayoutDashboard,
} satisfies Record<string, LucideIcon>

export type NavRouteIconKey = keyof typeof navRouteIcons
