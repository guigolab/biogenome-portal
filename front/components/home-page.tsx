'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
   ArrowRight,
   BarChart3,
   Dna,
   Globe,
   List,
   TreePine,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import { pickLocalized } from '@/lib/i18n/pickLocalized'
import { modelLucideMap } from '@/lib/modelIcons'
import { showMap, showProgress, taxonNodeToPortalStats, type DataModels } from '@/lib/portal'
import { useRootTaxonStore } from '@/stores/root-taxon-store'

/** Fixed hero strip: same labels as the legacy home page; counts from root taxon aggregates. */
const HERO_STRIP_STATS: { key: DataModels; labelKey: string }[] = [
   { key: 'organisms', labelKey: 'home.hero.stats.speciesTracked' },
   { key: 'assemblies', labelKey: 'home.hero.stats.genomesAvailable' },
   { key: 'biosamples', labelKey: 'home.hero.stats.biosamples' },
   { key: 'reads', labelKey: 'home.hero.stats.sequencingRuns' },
]

type HomeStatRow = {
   key: DataModels
   label: string
   value: string
}

export function HomePage() {
   const { config, loading: portalLoading } = usePortalConfig()
   const { locale, t } = useLocale()
   const [stats, setStats] = useState<HomeStatRow[]>([])
   const [statsLoading, setStatsLoading] = useState(true)

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
        }
      | undefined

   const title = useMemo(
      () => pickLocalized(general?.title, locale, 'BioGenome Portal'),
      [general?.title, locale],
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
   const kicker = useMemo(
      () => pickLocalized(general?.kicker, locale, 'BioGenome Portal'),
      [general?.kicker, locale],
   )

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
   const progressOn = config ? showProgress(config) : false

   const features = useMemo(() => {
      const items: Array<{
         href: string
         titleKey: string
         descKey: string
         icon: typeof Globe
         color: string
      }> = []
      if (mapOn) {
         items.push({
            href: '/map',
            titleKey: 'home.mapFeature.title',
            descKey: 'home.mapFeature.description',
            icon: Globe,
            color: 'bg-chart-1/10 text-chart-1',
         })
      }
      items.push({
         href: '/taxonomy',
         titleKey: 'home.taxonomyFeature.title',
         descKey: 'home.taxonomyFeature.description',
         icon: TreePine,
         color: 'bg-chart-2/10 text-chart-2',
      })
      items.push({
         href: '/species',
         titleKey: 'home.speciesFeature.title',
         descKey: 'home.speciesFeature.description',
         icon: List,
         color: 'bg-chart-3/10 text-chart-3',
      })
      if (progressOn) {
         items.push({
            href: '/status',
            titleKey: 'home.statusFeature.title',
            descKey: 'home.statusFeature.description',
            icon: BarChart3,
            color: 'bg-chart-4/10 text-chart-4',
         })
      }
      return items
   }, [mapOn, progressOn])

   if (portalLoading || !config) {
      return (
         <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
            {t('common.loading')}
         </div>
      )
   }

   return (
      <div className="min-h-screen bg-background">
         <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
            <div className="container relative mx-auto px-4 py-20 md:py-32">
               <div className="mx-auto max-w-3xl text-center">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.12] px-4 py-1.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-primary/10 backdrop-blur-sm dark:bg-primary/20 dark:ring-primary/20">
                     <Dna className="h-4 w-4 shrink-0" aria-hidden />
                     {kicker}
                  </div>
                  <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                     {title}
                  </h1>
                  <p className="mb-8 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
                     {description}
                  </p>
                  <div className="flex flex-col items-center gap-5">
                     <Button asChild size="lg" className="w-full sm:w-auto">
                        <Link href="/species">
                           <List className="mr-2 h-5 w-5" />
                           {t('home.cta.exploreSpecies')}
                        </Link>
                     </Button>
                     <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:gap-1">
                        <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
                           <Link href="/taxonomy">
                              <TreePine className="mr-2 h-5 w-5" />
                              {t('home.cta.browseTaxonomy')}
                           </Link>
                        </Button>
                        {mapOn && (
                           <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
                              <Link href="/map">
                                 <Globe className="mr-2 h-5 w-5" />
                                 {t('home.cta.exploreMap')}
                              </Link>
                           </Button>
                        )}
                     </div>
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
                        return (
                           <div key={stat.key} className="text-center">
                              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                 <Icon className="h-6 w-6 text-primary" aria-hidden />
                              </div>
                              <div className="mb-1 text-3xl font-bold text-foreground md:text-4xl">
                                 {stat.value}
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
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
               {features.map((feature) => {
                  const Icon = feature.icon
                  return (
                     <Link key={feature.href} href={feature.href}>
                        <Card className="group h-full cursor-pointer transition-all hover:border-primary/50">
                           <CardContent className="p-6">
                              <div
                                 className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`}
                              >
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
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
               <p>{t('home.footer')}</p>
            </div>
         </footer>
      </div>
   )
}
