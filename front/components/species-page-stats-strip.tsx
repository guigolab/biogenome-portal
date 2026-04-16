'use client'

import { List } from 'lucide-react'

import { useLocale } from '@/contexts/locale-context'
import { modelLucideMap } from '@/lib/modelIcons'
import type { DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'

export type SpeciesPageStatsStripProps = {
  assemblyCount: number
  biosampleCount: number
  readsCount: number
  locationsTotal: number
  hasMapCoords: boolean
}

type StatRow = {
  key: string
  modelKey: DataModels
  value: number
  labelKey: string
  iconWrapClass: string
  iconClass: string
}

/**
 * Original horizontal strip layout; icons from `modelLucideMap` and labels from the same i18n keys as the home hero stats.
 */
export function SpeciesPageStatsStrip({
  assemblyCount,
  biosampleCount,
  readsCount,
  locationsTotal,
  hasMapCoords,
}: SpeciesPageStatsStripProps) {
  const { locale, t } = useLocale()

  const rows: StatRow[] = []
  if (assemblyCount > 0) {
    rows.push({
      key: 'assemblies',
      modelKey: 'assemblies',
      value: assemblyCount,
      labelKey: 'home.hero.stats.genomesAvailable',
      iconWrapClass: 'bg-primary/10',
      iconClass: 'text-primary',
    })
  }
  if (biosampleCount > 0) {
    rows.push({
      key: 'biosamples',
      modelKey: 'biosamples',
      value: biosampleCount,
      labelKey: 'home.hero.stats.biosamples',
      iconWrapClass: 'bg-chart-2/10',
      iconClass: 'text-chart-2',
    })
  }
  if (readsCount > 0) {
    rows.push({
      key: 'reads',
      modelKey: 'reads',
      value: readsCount,
      labelKey: 'home.hero.stats.sequencingRuns',
      iconWrapClass: 'bg-chart-4/10',
      iconClass: 'text-chart-4',
    })
  }
  if (hasMapCoords && locationsTotal > 0) {
    rows.push({
      key: 'locations',
      modelKey: 'local_samples',
      value: locationsTotal,
      labelKey: 'map.legend.sampleLocations',
      iconWrapClass: 'bg-chart-3/10',
      iconClass: 'text-chart-3',
    })
  }

  if (rows.length === 0) return null

  const fmt = locale === 'cat' ? 'ca' : 'en'

  const statsGridClass =
    rows.length <= 1
      ? 'grid-cols-1 max-w-xs'
      : rows.length === 2
        ? 'grid-cols-2'
        : rows.length === 3
          ? 'grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-2 lg:grid-cols-4'

  return (
    <div className={cn('grid gap-4 mt-6 pt-6 border-t border-border', statsGridClass)}>
      {rows.map((stat) => {
        const Icon = modelLucideMap[stat.modelKey] ?? List
        return (
          <div key={stat.key} className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', stat.iconWrapClass)}>
              <Icon className={cn('h-5 w-5', stat.iconClass)} aria-hidden />
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value.toLocaleString(fmt)}</div>
              <div className="text-sm text-muted-foreground">{t(stat.labelKey)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
