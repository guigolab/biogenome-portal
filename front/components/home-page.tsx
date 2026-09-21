'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, ArrowUpRight, Dna, List } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import { splitTitleForHighlight } from '@/lib/i18n/titleHighlight'
import { pickLocalized } from '@/lib/i18n/pickLocalized'
import { footerLogoSrcWithBasePath } from '@/lib/portal/footerLogoPublicUrl'
import { cn } from '@/lib/utils'
import { modelLucideMap } from '@/lib/modelIcons'
import { navRouteIcons, showMap, taxonNodeToPortalStats, type DataModels } from '@/lib/portal'
import { useRootTaxonStore } from '@/stores/root-taxon-store'

/** Default hero kicker when portal.json omits general.kicker — links to the app publication. */
const DEFAULT_KICKER_LABEL = 'BioGenome Portal'
const DEFAULT_KICKER_PUBLICATION_URL = 'https://doi.org/10.1093/nargab/lqaf020'

/** Fixed hero strip: same labels as the legacy home page; counts from root taxon aggregates. */
const HERO_STRIP_STATS: { key: DataModels; labelKey: string }[] = [
   { key: 'organisms', labelKey: 'home.hero.stats.speciesTracked' },
   { key: 'assemblies', labelKey: 'home.hero.stats.genomesAvailable' },
   { key: 'biosamples', labelKey: 'home.hero.stats.biosamples' },
   { key: 'annotations', labelKey: 'home.hero.stats.annotations' },
   { key: 'reads', labelKey: 'home.hero.stats.sequencingRuns' },
]

function homeStatHref(key: DataModels): string {
   if (key === 'organisms') return '/species'
   return `/catalog?cat=${encodeURIComponent(key)}`
}

type HomeStatRow = {
   key: DataModels
   label: string
   value: string
}

export function HomePage() {
   const { config, raw, loading: portalLoading } = usePortalConfig()
   const { locale, t } = useLocale()
   const [stats, setStats] = useState<HomeStatRow[]>([])
   const [statsLoading, setStatsLoading] = useState(true)
   const [footerLogoFailed, setFooterLogoFailed] = useState(false)

   const rootTaxon = useRootTaxonStore((s) => s.rootTaxon)
   const rootStatus = useRootTaxonStore((s) => s.status)
   const loadRootTaxon = useRootTaxonStore((s) => s.loadRootTaxon)

   useEffect(() => {
      void loadRootTaxon()
   }, [loadRootTaxon])

   const general = config?.general as
      | {
           title?: Record<string, string>
           description?: Record<string, string>
           kicker?: Record<string, string>
           titleHighlight?: Record<string, string>
           externalLink?: string
        }
      | undefined

   const title = useMemo(
      () => pickLocalized(general?.title, locale, 'BioGenome Portal'),
      [general?.title, locale],
   )
   const titleHighlightPhrase = useMemo(
      () => pickLocalized(general?.titleHighlight, locale, ''),
      [general?.titleHighlight, locale],
   )
   const description = useMemo(
      () =>
         pickLocalized(
            general?.description,
            locale,
            'Explore all the data contained in this instance',
         ),
      [general?.description, locale],
   )
   const configuredKicker = useMemo(
      () => pickLocalized(general?.kicker, locale, '').trim(),
      [general?.kicker, locale],
   )
   const kicker = configuredKicker || DEFAULT_KICKER_LABEL
   const kickerIsPublicationLink = !configuredKicker

   const footer = config?.footer
   const footerCopyright = useMemo(
      () => pickLocalized(footer?.copyright, locale, ''),
      [footer?.copyright, locale],
   )
   const footerTagline = useMemo(
      () => pickLocalized(footer?.tagline, locale, ''),
      [footer?.tagline, locale],
   )
   const externalLink = useMemo(() => {
      const link = general?.externalLink?.trim()
      return link ? link : null
   }, [general?.externalLink])

   useEffect(() => {
      setFooterLogoFailed(false)
   }, [footer?.logoUrl])

   const footerLogoSrc = useMemo(() => {
      const path = footer?.logoUrl?.trim()
      if (!path || footerLogoFailed) return null
      return footerLogoSrcWithBasePath(path) || null
   }, [footer?.logoUrl, footerLogoFailed])
   const heroAccentStyle = useMemo(() => {
      const colors = raw?.theme?.colors as Record<string, unknown> | undefined
      const primary = typeof colors?.primary === 'string' ? colors.primary : null
      const secondary = typeof colors?.secondary === 'string' ? colors.secondary : null
      const accent = typeof colors?.accent === 'string' ? colors.accent : null
      return {
         ...(primary ? { ['--home-hero-primary' as string]: primary } : {}),
         ...(secondary ? { ['--home-hero-secondary' as string]: secondary } : {}),
         ...(accent ? { ['--home-hero-accent' as string]: accent } : {}),
      } as CSSProperties
   }, [raw?.theme?.colors])

   const titleParts = useMemo(
      () => splitTitleForHighlight(title, titleHighlightPhrase),
      [title, titleHighlightPhrase],
   )

   const footerMainAndSub = useMemo(() => {
      if (!footer) {
         return { main: t('home.footer'), sub: null as string | null }
      }
      if (footerCopyright) {
         return { main: footerCopyright, sub: footerTagline || null }
      }
      if (footerTagline) {
         return { main: footerTagline, sub: null }
      }
      return { main: '', sub: null }
   }, [footer, footerCopyright, footerTagline, t])

   useEffect(() => {
      if (rootStatus === 'loading' || rootStatus === 'idle') {
         setStatsLoading(true)
         return
      }
      setStatsLoading(false)
      if (rootStatus === 'error' || !rootTaxon) {
         setStats([])
         return
      }
      const counts = taxonNodeToPortalStats(rootTaxon)
      const countByKey = Object.fromEntries(counts.map((c) => [c.key, c.count]))
      const fmt = locale === 'cat' ? 'ca' : 'en'
      const rows: HomeStatRow[] = HERO_STRIP_STATS.map(({ key, labelKey }) => {
         const n = (countByKey[key] as number) ?? 0
         return { key, label: t(labelKey), count: n }
      })
         .filter((row) => row.count > 0)
         .map((row) => ({
            key: row.key,
            label: row.label,
            value: row.count.toLocaleString(fmt),
         }))
      setStats(rows)
   }, [locale, t, rootTaxon, rootStatus])

   const mapOn = config ? showMap(config) : true

   const portalStatCounts = useMemo(() => {
      if (!rootTaxon) return null
      const counts = taxonNodeToPortalStats(rootTaxon)
      return Object.fromEntries(counts.map((c) => [c.key, c.count])) as Partial<Record<DataModels, number>>
   }, [rootTaxon])

   const features = useMemo(() => {
      const items: Array<{
         href: string
         titleKey: string
         descKey: string
         icon: LucideIcon
      }> = []
      if (mapOn) {
         items.push({
            href: '/map',
            titleKey: 'home.mapFeature.title',
            descKey: 'home.mapFeature.description',
            icon: navRouteIcons.map,
         })
      }
      const assemblies = portalStatCounts?.assemblies ?? 0
      const annotations = portalStatCounts?.annotations ?? 0
      if (assemblies > 0 && annotations > 0) {
         items.push({
            href: '/genome-browser',
            titleKey: 'home.genomeBrowserFeature.title',
            descKey: 'home.genomeBrowserFeature.description',
            icon: navRouteIcons.genomeBrowser,
         })
      }
      items.push({
         href: '/taxonomy',
         titleKey: 'home.taxonomyFeature.title',
         descKey: 'home.taxonomyFeature.description',
         icon: navRouteIcons.taxonomy,
      })
      return items
   }, [mapOn, portalStatCounts])

   if (portalLoading || !config) {
      return (
         <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
            {t('common.loading')}
         </div>
      )
   }

   const SpeciesCtaIcon = navRouteIcons.species
   const CatalogCtaIcon = navRouteIcons.catalog

   return (
      <div className="min-h-screen bg-background">
         <section className="relative overflow-hidden border-b border-border" style={heroAccentStyle}>
            <div
               className="absolute inset-0"
               style={{
                  background:
                     'radial-gradient(ellipse at top, color-mix(in oklch, var(--home-hero-primary, var(--primary)) 20%, transparent), color-mix(in oklch, var(--home-hero-accent, var(--accent)) 6%, transparent) 45%, transparent 100%)',
               }}
            />
            <div
               className="absolute inset-x-0 -top-24 h-56 blur-3xl opacity-60"
               style={{
                  background:
                     'linear-gradient(90deg, color-mix(in oklch, var(--home-hero-secondary, var(--secondary)) 35%, transparent), color-mix(in oklch, var(--home-hero-primary, var(--primary)) 28%, transparent), color-mix(in oklch, var(--home-hero-accent, var(--accent)) 35%, transparent))',
               }}
            />
            <div className="container relative mx-auto px-4 py-20 md:py-32">
               <div className="mx-auto max-w-3xl text-center">
                  {kickerIsPublicationLink ? (
                     <a
                        href={DEFAULT_KICKER_PUBLICATION_URL}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t('home.kickerPublicationAria')}
                        className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.12] px-4 py-1.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-primary/10 backdrop-blur-sm transition-colors hover:bg-primary/[0.18] hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-primary/20 dark:ring-primary/20 dark:hover:bg-primary/30"
                     >
                        <Dna className="h-4 w-4 shrink-0" aria-hidden />
                        {kicker}
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                     </a>
                  ) : (
                     <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.12] px-4 py-1.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-primary/10 backdrop-blur-sm dark:bg-primary/20 dark:ring-primary/20">
                        <Dna className="h-4 w-4 shrink-0" aria-hidden />
                        {kicker}
                     </div>
                  )}
                  <h1 className="mb-6 flex flex-wrap items-center justify-center gap-3 text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                     <span>
                        {titleParts ? (
                           <>
                              {titleParts.before}
                              <span className="text-primary">{titleParts.hit}</span>
                              {titleParts.after}
                           </>
                        ) : (
                           title
                        )}
                     </span>
                  </h1>
                  <p className="mb-8 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
                     {description}
                  </p>
                  <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                     <Button asChild size="lg" className="w-full sm:w-auto">
                        <Link href="/species">
                           <SpeciesCtaIcon className="mr-2 h-5 w-5" />
                           {t('home.cta.exploreSpecies')}
                        </Link>
                     </Button>
                     <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                        <Link href="/catalog">
                           <CatalogCtaIcon className="mr-2 h-5 w-5" />
                           {t('home.cta.exploreCatalog')}
                        </Link>
                     </Button>
                  </div>
               </div>
            </div>
         </section>

         <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-muted/70 via-muted/45 to-muted/25 dark:from-muted/25 dark:via-muted/15 dark:to-muted/5">
            <div
               className="pointer-events-none absolute inset-0 bg-primary/[0.07] [mask-image:radial-gradient(ellipse_100%_75%_at_50%_-35%,black_40%,transparent_70%)] dark:bg-primary/[0.11]"
               aria-hidden
            />
            <div className="container relative mx-auto px-4 py-12">
               {statsLoading ? (
                  <p className="text-center text-muted-foreground">{t('common.loading')}</p>
               ) : stats.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">{t('home.emptyStats')}</p>
               ) : (
                  <div className="mx-auto grid w-full max-w-5xl justify-items-center gap-6 [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
                     {stats.map((stat) => {
                        const Icon = modelLucideMap[stat.key] ?? List
                        const href = homeStatHref(stat.key)
                        const isSpeciesStat = stat.key === 'organisms'
                        return (
                           <div key={stat.key} className="text-center">
                              <div
                                 className={cn(
                                    'mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg',
                                    isSpeciesStat ? 'bg-primary/10' : 'bg-secondary/10',
                                 )}
                              >
                                 <Icon
                                    className={cn(
                                       'h-6 w-6',
                                       isSpeciesStat ? 'text-primary' : 'text-secondary',
                                    )}
                                    aria-hidden
                                 />
                              </div>
                              <div className="mb-1 flex items-center justify-center gap-2 text-3xl font-bold text-foreground md:text-4xl">
                                 <span>{stat.value}</span>
                                 <Link
                                    href={href}
                                    className={cn(
                                       'inline-flex text-muted-foreground',
                                       isSpeciesStat
                                          ? 'hover:text-primary'
                                          : 'hover:text-secondary',
                                    )}
                                    aria-label={
                                       isSpeciesStat
                                          ? `Open ${stat.label}`
                                          : `Open ${stat.label} in catalog`
                                    }
                                    title={
                                       isSpeciesStat
                                          ? `Open ${stat.label}`
                                          : `Open ${stat.label} in catalog`
                                    }
                                 >
                                    <ArrowUpRight className="h-5 w-5" />
                                 </Link>
                              </div>
                              <div className="text-sm text-muted-foreground">{stat.label}</div>
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>
         </section>

         <section className="container mx-auto px-4 py-16 md:py-24">
            <div className="mb-12 text-center">
               <h2 className="mb-4 text-3xl font-bold">{t('home.features.title')}</h2>
               <p className="mx-auto max-w-2xl text-pretty text-muted-foreground">
                  {t('home.features.subtitle')}
               </p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
               {features.map((feature) => {
                  const Icon = feature.icon
                  return (
                     <Link key={feature.href} href={feature.href}>
                        <Card className="group h-full cursor-pointer transition-all hover:border-primary/50">
                           <CardContent className="p-6">
                              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                                 <Icon className="h-6 w-6" aria-hidden />
                              </div>
                              <h3 className="mb-2 flex items-center gap-2 text-xl font-semibold transition-colors group-hover:text-primary">
                                 {t(feature.titleKey)}
                                 <ArrowRight className="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                              </h3>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                 {t(feature.descKey)}
                              </p>
                           </CardContent>
                        </Card>
                     </Link>
                  )
               })}
            </div>
         </section>

         <section className="relative overflow-hidden border-t border-border bg-gradient-to-b from-muted/25 via-muted/45 to-muted/70 dark:from-muted/5 dark:via-muted/15 dark:to-muted/25">
            <div
               className="pointer-events-none absolute inset-0 bg-primary/[0.06] [mask-image:radial-gradient(ellipse_100%_75%_at_50%_135%,black_40%,transparent_70%)] dark:bg-primary/[0.1]"
               aria-hidden
            />
            <div className="container relative mx-auto px-4 py-16">
               <div className="mx-auto max-w-2xl text-center">
                  <h2 className="mb-4 text-2xl font-bold">{t('home.closing.title')}</h2>
                  <p className="mb-6 text-muted-foreground">{t('home.closing.description')}</p>
                  <Button asChild size="lg">
                     <Link href="/species">
                        {t('home.cta.viewSpecies')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                     </Link>
                  </Button>
               </div>
            </div>
         </section>

         <footer className="border-t border-border py-8">
            <div
               className={cn(
                  'container mx-auto flex flex-col items-center gap-6 px-4 text-sm text-muted-foreground',
                  footerLogoSrc && footerCopyright && 'sm:flex-row sm:justify-between sm:text-left',
               )}
            >
               {footerLogoSrc ? (
                  externalLink ? (
                     <a
                        href={externalLink}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={title}
                        className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                     >
                        <img
                           src={footerLogoSrc}
                           alt={title}
                           className="h-10 max-w-[min(16rem,70vw)] object-contain object-center opacity-90 sm:h-12"
                           decoding="async"
                           onError={() => setFooterLogoFailed(true)}
                        />
                     </a>
                  ) : (
                     <img
                        src={footerLogoSrc}
                        alt={title}
                        className="h-10 max-w-[min(16rem,70vw)] object-contain object-center opacity-90 sm:h-12"
                        decoding="async"
                        onError={() => setFooterLogoFailed(true)}
                     />
                  )
               ) : null}
               <div
                  className={cn(
                     'flex max-w-2xl flex-col gap-1 text-center',
                     footerLogoSrc && footerMainAndSub.main && 'sm:items-end sm:text-right',
                  )}
               >
                  {footerMainAndSub.main ? <p>{footerMainAndSub.main}</p> : null}
                  {footerMainAndSub.sub ? (
                     <p className="text-xs text-muted-foreground/90">{footerMainAndSub.sub}</p>
                  ) : null}
                  {externalLink ? (
                     <a
                        href={externalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                     >
                        {t('home.footerMainWebsite')}
                     </a>
                  ) : null}
               </div>
            </div>
         </footer>
      </div>
   )
}
