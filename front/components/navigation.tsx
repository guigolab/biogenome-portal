'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Dna, Menu } from 'lucide-react'

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
import { pickLocalized } from '@/lib/i18n/pickLocalized'
import {
   navRouteIcons,
   showCmsLoginNav,
   showGoatStatusPage,
   showMap,
} from '@/lib/portal'
import { cn } from '@/lib/utils'

const LOGO_PUBLIC_PATH = '/portal-logo.svg'

export function Navigation() {
   const pathname = usePathname()
   const [logoFailed, setLogoFailed] = useState(false)
   const { config } = usePortalConfig()

   const logoSrc = useMemo(() => {
      const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
      return bp ? `${bp}${LOGO_PUBLIC_PATH}` : LOGO_PUBLIC_PATH
   }, [])
   const { locale, t } = useLocale()

   const general = config?.general as
      | {
           title?: Record<string, string>
           externalLink?: string
        }
      | undefined
   const brand = pickLocalized(general?.title, locale, 'BioGenome')
   const externalLink = general?.externalLink?.trim()

   const mapOn = config ? showMap(config) : true
   const goatStatusNav = config ? showGoatStatusPage(config) : false
   const cmsLoginOn = config ? showCmsLoginNav(config) : false

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
      ...(goatStatusNav ? [{ href: '/status', label: t('nav.status'), icon: navRouteIcons.status }] : []),
      ...(cmsLoginOn
         ? [{ href: '/login', label: t('nav.login'), icon: navRouteIcons.login }]
         : []),
   ]

   const linkClass = (isActive: boolean) =>
      cn(
         'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
         isActive
            ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-inset ring-primary/25'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
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
                     className="flex min-w-0 shrink items-center gap-2 sm:gap-3"
                  >
                     {logoFailed ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary sm:h-10 sm:w-10">
                           <Dna className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
                        </div>
                     ) : (
                        <span className="box-border inline-flex shrink-0 items-center py-1.5 pl-0 pr-1 sm:py-2 sm:px-1.5">
                           <img
                              src={logoSrc}
                              alt={brand}
                              decoding="async"
                              className="max-h-9 w-auto max-w-[min(12rem,38vw)] object-contain object-left sm:max-h-12 sm:max-w-[min(20rem,55vw)] md:max-w-[min(20rem,70vw)]"
                              onError={() => setLogoFailed(true)}
                           />
                        </span>
                     )}
                     {logoFailed ? (
                        <span
                           className="min-w-0 truncate text-base font-semibold tracking-tight sm:text-lg max-md:max-w-[min(9.5rem,34vw)] md:max-w-[min(18rem,28vw)] lg:max-w-md xl:max-w-xl 2xl:max-w-none"
                           title={brand}
                        >
                           {brand}
                        </span>
                     ) : null}
                  </a>
               ) : (
                  <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
                     {logoFailed ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary sm:h-10 sm:w-10">
                           <Dna className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
                        </div>
                     ) : (
                        <span className="box-border inline-flex shrink-0 items-center py-1.5 pl-0 pr-1 sm:py-2 sm:px-1.5">
                           <img
                              src={logoSrc}
                              alt={brand}
                              decoding="async"
                              className="max-h-9 w-auto max-w-[min(12rem,38vw)] object-contain object-left sm:max-h-12 sm:max-w-[min(20rem,55vw)] md:max-w-[min(20rem,70vw)]"
                              onError={() => setLogoFailed(true)}
                           />
                        </span>
                     )}
                     {logoFailed ? (
                        <span
                           className="min-w-0 truncate text-base font-semibold tracking-tight sm:text-lg max-md:max-w-[min(9.5rem,34vw)] md:max-w-[min(18rem,28vw)] lg:max-w-md xl:max-w-xl 2xl:max-w-none"
                           title={brand}
                        >
                           {brand}
                        </span>
                     ) : null}
                  </Link>
               )}

               <div className="hidden shrink-0 items-center gap-2 md:flex">
                  <nav className="flex flex-wrap items-center gap-1">
                     {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
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
                           const isActive = pathname === item.href
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
