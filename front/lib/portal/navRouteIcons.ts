import type { LucideIcon } from 'lucide-react'
import {
   Activity,
   Dna,
   FolderTree,
   Home,
   LayoutDashboard,
   Leaf,
   LogIn,
   Map,
   TableProperties,
} from 'lucide-react'

/** Lucide icons for main nav routes; reuse in page headers for visual consistency. */
export const navRouteIcons = {
   home: Home,
   map: Map,
   taxonomy: FolderTree,
   species: Leaf,
   catalog: TableProperties,
   genomeBrowser: Dna,
   status: Activity,
   login: LogIn,
   myArea: LayoutDashboard,
} satisfies Record<string, LucideIcon>

export type NavRouteIconKey = keyof typeof navRouteIcons
