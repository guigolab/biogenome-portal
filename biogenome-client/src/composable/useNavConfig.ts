/**
 * Centralized nav config aligned with router routes.
 * Single source of truth for Navbar and MobileNavbarMenu.
 */
import type { AppConfig } from '../data/types'

export interface NavModel {
   text: string
   value: string
}

export interface NavLinkItem {
   /** Route name from router/index.ts */
   routeName: string
   /** i18n key for label (e.g. 'nav.taxExplorer', 'map.title') */
   labelKey: string
   /** Optional route params */
   params?: Record<string, string>
}

export interface NavActionItem {
   actionId: 'goat-report'
   /** i18n key for label */
   labelKey: string
}

export interface NavExternalItem {
   href: string
   label: string
}

export type NavItem = NavLinkItem | NavActionItem | NavExternalItem

export function isNavLink(item: NavItem): item is NavLinkItem {
   return 'routeName' in item
}
export function isNavAction(item: NavItem): item is NavActionItem {
   return 'actionId' in item
}
export function isNavExternal(item: NavItem): item is NavExternalItem {
   return 'href' in item
}

/**
 * Data items: models + Geographic Explorer (route /data/map).
 * Aligns with router: model (/data/:model), dataMap (/data/map).
 */
export function getDataNavItems(config: AppConfig): NavModel[] {
   return Object.keys(config.models).map((k) => ({ text: k, value: k }))
}

/**
 * Tools items: Taxonomy Explorer, Genome Browser, Goat Report.
 * Routes: tree (/tree), jbrowse (/jbrowse).
 */
export function getToolsNavItems(config: AppConfig, hasGoat: boolean): (NavLinkItem | NavActionItem)[] {
   const items: NavItem[] = [
      { routeName: 'tree', labelKey: 'nav.taxExplorer' },
      { routeName: 'dataMap', labelKey: 'map.title' },
      ...(config.models?.assemblies ? [{ routeName: 'jbrowse', labelKey: 'nav.genomeBrowser' }] : []),
   ] as NavLinkItem[]
   if (hasGoat) {
      items.push({ actionId: 'goat-report', labelKey: 'buttons.goat' })
   }
   return items
}

/**
 * Settings/Resources: external links.
 */
export function getSettingsNavItems(externalLink?: string): NavExternalItem[] {
   const items: NavExternalItem[] = [
      { href: 'https://github.com/guigolab/biogenome-portal', label: 'GitHub' },
      { href: 'https://guigolab.github.io/biogenome-portal/', label: 'Docs' },
   ]
   if (externalLink) {
      items.push({ href: externalLink, label: 'Website' })
   }
   return items
}
