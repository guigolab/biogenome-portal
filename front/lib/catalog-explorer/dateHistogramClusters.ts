import type { DateHistogramBucket } from '@/lib/api/stats'

const DAY_MS = 86400000

export type HistogramCluster = {
   /** Bar index (0 .. n-1), aligned with range slider. */
   i: number
   count: number
   /** Inclusive catalog `__gte` (YYYY-MM-DD). */
   from: string
   /** Inclusive catalog `__lte` (YYYY-MM-DD). */
   to: string
}

/** Primary calendar day from ENA value (first YYYY-MM-DD segment; ignores range tail for bucketing). */
function primaryDayMs(value: string): number | null {
   const head = value.trim().split('/')[0]?.split('T')[0]?.trim() ?? ''
   const m = /^([12]\d{3})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(head)
   if (!m) return null
   const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
   return Number.isFinite(t) ? t : null
}

function ymdUtc(ms: number): string {
   const d = new Date(ms)
   const y = d.getUTCFullYear()
   const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
   const da = String(d.getUTCDate()).padStart(2, '0')
   return `${y}-${mo}-${da}`
}

function lastDayOfMonthUtc(y: number, monthIndex0: number): string {
   const last = new Date(Date.UTC(y, monthIndex0 + 1, 0))
   return ymdUtc(last.getTime())
}

type DayBin = { dayMs: number; count: number }

function mergeToDayBins(buckets: DateHistogramBucket[]): DayBin[] {
   const map = new Map<number, number>()
   for (const b of buckets) {
      const ms = primaryDayMs(b.value)
      if (ms == null) continue
      map.set(ms, (map.get(ms) ?? 0) + b.count)
   }
   return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([dayMs, count]) => ({ dayMs, count }))
}

function chooseGranularity(days: DayBin[]): 'day' | 'month' | 'year' {
   const n = days.length
   if (n === 0) return 'day'
   const min = days[0]!.dayMs
   const max = days[n - 1]!.dayMs
   const spanYears = (max - min) / (365.25 * DAY_MS)
   // Dense timelines → coarser bins
   if (n > 300 || spanYears > 12) return 'year'
   if (n > 90 || spanYears > 4) return 'month'
   return 'day'
}

/**
 * Turns raw stats buckets into day / month / year bars for the histogram + shared-range slider.
 * Only **calendar ISO** rows contribute (server already restricts; this merges parses defensively).
 */
export function buildHistogramClusters(buckets: DateHistogramBucket[]): HistogramCluster[] {
   const days = mergeToDayBins(buckets)
   if (days.length === 0) return []

   const g = chooseGranularity(days)

   if (g === 'day') {
      return days.map((d, i) => ({
         i,
         count: d.count,
         from: ymdUtc(d.dayMs),
         to: ymdUtc(d.dayMs),
      }))
   }

   if (g === 'month') {
      const monthMap = new Map<string, number>()
      for (const d of days) {
         const dt = new Date(d.dayMs)
         const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
         monthMap.set(key, (monthMap.get(key) ?? 0) + d.count)
      }
      const keys = [...monthMap.keys()].sort()
      return keys.map((key, i) => {
         const [ys, ms] = key.split('-')
         const y = Number(ys)
         const m0 = Number(ms) - 1
         return {
            i,
            count: monthMap.get(key)!,
            from: `${key}-01`,
            to: lastDayOfMonthUtc(y, m0),
         }
      })
   }

   const yearMap = new Map<number, number>()
   for (const d of days) {
      const y = new Date(d.dayMs).getUTCFullYear()
      yearMap.set(y, (yearMap.get(y) ?? 0) + d.count)
   }
   const years = [...yearMap.keys()].sort((a, b) => a - b)
   return years.map((y, i) => ({
      i,
      count: yearMap.get(y)!,
      from: `${y}-01-01`,
      to: `${y}-12-31`,
   }))
}

function idxForGteBound(clusters: HistogramCluster[], iso: string): number {
   const s = iso.trim()
   const direct = clusters.findIndex((c) => s >= c.from && s <= c.to)
   if (direct >= 0) return direct
   const after = clusters.findIndex((c) => c.from >= s)
   if (after >= 0) return after
   return clusters.length - 1
}

function idxForLteBound(clusters: HistogramCluster[], iso: string): number {
   const s = iso.trim()
   const direct = clusters.findIndex((c) => s >= c.from && s <= c.to)
   if (direct >= 0) return direct
   for (let i = clusters.length - 1; i >= 0; i--) {
      if (clusters[i]!.to <= s) return i
   }
   return 0
}

/** Map current filter strings to slider indices on clustered bars. */
export function clusterIndicesForFilter(
   clusters: HistogramCluster[],
   from?: string,
   to?: string,
): [number, number] {
   const n = clusters.length
   if (n === 0) return [0, 0]
   const last = n - 1
   const f = from?.trim()
   const t = to?.trim()
   if (!f && !t) return [0, last]

   let lo = 0
   let hi = last
   if (f) lo = idxForGteBound(clusters, f)
   if (t) hi = idxForLteBound(clusters, t)
   if (lo > hi) [lo, hi] = [hi, lo]
   return [Math.max(0, Math.min(lo, last)), Math.max(0, Math.min(hi, last))]
}
