'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Menu } from 'lucide-react'

import { AppearanceSwitcher } from '@/components/appearance-switcher'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui/button'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import { useCmsNavSession } from '@/hooks/use-cms-nav-session'
import { pickLocalized } from '@/lib/i18n/pickLocalized'
import { footerLogoSrcWithBasePath } from '@/lib/portal/footerLogoPublicUrl'
import { navRouteIcons, showCmsLoginNav, showMap } from '@/lib/portal'
import { cn } from '@/lib/utils'

const brandTitleClassName =
   'min-w-0 truncate text-base font-semibold tracking-tight text-foreground sm:text-lg max-md:max-w-[min(12rem,55vw)] md:max-w-[min(18rem,40vw)] lg:max-w-md xl:max-w-xl 2xl:max-w-none'

const brandShellClassName =
   'flex max-w-[min(100%,28rem)] shrink-0 items-center gap-2 sm:gap-3 text-foreground transition-colors hover:text-foreground/90'

const customLogoImgClassName =
   'h-9 w-auto max-w-[min(12rem,38vw)] shrink-0 object-contain object-left sm:h-10 sm:max-w-[min(20rem,55vw)] md:max-w-[min(20rem,70vw)]'

export function Navigation() {
   const pathname = usePathname()
   const [logoFailed, setLogoFailed] = useState(false)
   const { config, loading: portalLoading } = usePortalConfig()

   const footerLogo = config?.footer?.logoUrl?.trim()
   const usesFooterLogo = Boolean(footerLogo)

   const logoSrc = useMemo(() => footerLogoSrcWithBasePath(footerLogo), [footerLogo])

   useEffect(() => {
      setLogoFailed(false)
   }, [footerLogo])

   const { locale, t } = useLocale()

   const general = config?.general as
      | {
           title?: Record<string, string>
           externalLink?: string
        }
      | undefined
   const picked = pickLocalized(general?.title, locale, 'BioGenome')
   const brand = picked.trim() || 'BioGenome'
   const externalLink = general?.externalLink?.trim()

   const mapOn = config ? showMap(config) : true
   const cmsLoginOn = config ? showCmsLoginNav(config) : false
   const { showMyArea } = useCmsNavSession({
      enabled: cmsLoginOn,
      portalLoading,
   })

   const navItems = [
      { href: '/', label: t('nav.home'), icon: navRouteIcons.home },
      ...(mapOn ? [{ href: '/map', label: t('nav.map'), icon: navRouteIcons.map }] : []),
      { href: '/taxonomy', label: t('nav.taxonomy'), icon: navRouteIcons.taxonomy },
      { href: '/species', label: t('nav.species'), icon: navRouteIcons.species },
      { href: '/catalog', label: t('nav.catalog'), icon: navRouteIcons.catalog },
      {
         href: '/genome-browser',
         label: t('nav.genomeBrowser'),
         icon: navRouteIcons.genomeBrowser,
      },
      ...(cmsLoginOn
         ? [
              showMyArea
                 ? {
                      href: '/admin',
                      label: t('nav.myArea'),
                      icon: navRouteIcons.myArea,
                      match: (p: string) => p.startsWith('/admin'),
                   }
                 : {
                      href: '/login',
                      label: t('nav.login'),
                      icon: navRouteIcons.login,
                      match: (p: string) => p === '/login',
                   },
           ]
         : []),
   ]

   const navItemIsActive = (item: (typeof navItems)[number], p: string) =>
      'match' in item && item.match ? item.match(p) : p === item.href

   const linkClass = (isActive: boolean) =>
      cn(
         'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
         isActive
            ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-inset ring-primary/25'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )

   // Logo only when `footer.logoUrl` is set and the asset loads; otherwise title only (no bundled default logo).
   const showLogo = usesFooterLogo && !logoFailed
   const showTitle = !showLogo

   const brandInner = (
      <>
         {showLogo ? (
            <img
               src={logoSrc}
               alt=""
               decoding="async"
               className={customLogoImgClassName}
               onError={() => setLogoFailed(true)}
            />
         ) : null}
         {showTitle ? (
            <span className={brandTitleClassName} title={brand}>
               {brand}
            </span>
         ) : null}
      </>
   )

   return (
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
         <div className="w-full px-4">
            <div className="flex h-16 w-full min-w-0 items-center justify-between gap-3 sm:gap-4">
               {externalLink ? (
                  <a
                     href={externalLink}
                     target="_blank"
                     rel="noreferrer"
                     className={brandShellClassName}
                     aria-label={showLogo ? brand : undefined}
                  >
                     {brandInner}
                  </a>
               ) : (
                  <Link
                     href="/"
                     className={brandShellClassName}
                     aria-label={showLogo ? brand : undefined}
                  >
                     {brandInner}
                  </Link>
               )}

               <div className="hidden min-w-0 shrink-0 items-center gap-2 md:flex">
                  <nav className="flex flex-wrap items-center gap-1">
                     {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = navItemIsActive(item, pathname)
                        return (
                           <Link key={item.href} href={item.href} className={linkClass(isActive)}>
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="whitespace-nowrap">{item.label}</span>
                           </Link>
                        )
                     })}
                  </nav>
                  <AppearanceSwitcher />
                  <LanguageSwitcher />
               </div>

               <div className="flex shrink-0 items-center gap-1 md:hidden">
                  <AppearanceSwitcher />
                  <LanguageSwitcher />
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           className="shrink-0"
                           aria-label={t('nav.menu')}
                        >
                           <Menu className="h-5 w-5" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                        {navItems.map((item) => {
                           const Icon = item.icon
                           const isActive = navItemIsActive(item, pathname)
                           return (
                              <DropdownMenuItem key={item.href} asChild>
                                 <Link
                                    href={item.href}
                                    className={cn(
                                       'cursor-pointer gap-2',
                                       isActive && 'bg-primary/10 text-primary font-medium',
                                    )}
                                 >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {item.label}
                                 </Link>
                              </DropdownMenuItem>
                           )
                        })}
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            </div>
         </div>
      </header>
   )
}
