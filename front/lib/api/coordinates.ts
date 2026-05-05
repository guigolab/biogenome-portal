import { getApiBase } from '@/lib/api/taxon'

/** One row from GET/POST ``/coordinates`` (SampleCoordinates as Mongo JSON). */
export type SampleCoordinatesPayload = {
   total: number
   data: Record<string, unknown>[]
}

export type LocationFrequencyPoint = {
   coordinates: [number, number]
   count: number
   /** Species taxids aggregated at this coordinate (for map ↔ list hover). */
   taxids?: string[]
   /** Sample image URLs pushed from aggregation (optional). */
   images?: string[]
}

function normalizeFrequencyPayload(data: unknown): LocationFrequencyPoint[] {
   if (!Array.isArray(data)) return []
   return data
      .map((row) => {
         if (!row || typeof row !== 'object') return null
         const r = row as Record<string, unknown>
         const coords = r.coordinates
         const count = r.count
         const rawTaxids = r.taxids
         if (!Array.isArray(coords) || coords.length < 2) return null
         const lng = Number(coords[0])
         const lat = Number(coords[1])
         if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
         const n = typeof count === 'number' ? count : Number(count)
         if (!Number.isFinite(n)) return null
         const taxids =
            Array.isArray(rawTaxids) && rawTaxids.length > 0
               ? rawTaxids.map((t) => String(t).trim()).filter(Boolean)
               : undefined
         const rawImages = r.images
         const images =
            Array.isArray(rawImages) && rawImages.length > 0
               ? rawImages.map((u) => String(u).trim()).filter(Boolean)
               : undefined
         return {
            coordinates: [lng, lat] as [number, number],
            count: n,
            ...(taxids && taxids.length > 0 ? { taxids } : {}),
            ...(images && images.length > 0 ? { images } : {}),
         }
      })
      .filter((x): x is LocationFrequencyPoint => x != null)
}

/**
 * GET /coordinates/frequency — aggregated sample locations (no polygon filter in query string).
 */
export async function fetchLocationsFrequency(
   params: Record<string, string | number | boolean | undefined | null>,
): Promise<LocationFrequencyPoint[]> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      sp.set(key, String(value))
   }
   const q = sp.toString()
   const url = `${base}/coordinates/frequency${q ? `?${q}` : ''}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`coordinates/frequency: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as unknown
   return normalizeFrequencyPayload(json)
}

/** GeoJSON geometry object (e.g. from Leaflet `layer.toGeoJSON().geometry`). */
export type GeoJsonGeometry = Record<string, unknown>

export type PostLocationsFrequencyBody = {
   /** SampleCoordinates lineage filter (same semantics as map list when using URL taxid). */
   taxid?: string
   /** Organism catalog filter (GET /organisms). */
   taxon_lineage?: string
   polygon?: GeoJsonGeometry
   sample_type?: string
   sample_accession?: string
   /** Full-text filter (organism_query + sample fields in geo query). */
   filter?: string
   iucn_redlist__category?: string
   insdc_counts_any?: string
}

/**
 * POST /coordinates/frequency — same filters as GET; body may include GeoJSON geometry for polygon.
 */
export async function postLocationsFrequency(body: PostLocationsFrequencyBody): Promise<LocationFrequencyPoint[]> {
   const base = getApiBase()
   const url = `${base}/coordinates/frequency`
   const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
   })
   if (!res.ok) {
      throw new Error(`coordinates/frequency POST: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as unknown
   return normalizeFrequencyPayload(json)
}

export type DownloadPolygonBody = PostLocationsFrequencyBody & {
   model: string
}

/**
 * POST /coordinates/frequency/download — TSV export for selection (requires polygon server-side usage via body).
 */
export async function downloadPolygonData(body: DownloadPolygonBody): Promise<Blob> {
   const base = getApiBase()
   const url = `${base}/coordinates/frequency/download`
   const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'text/tab-separated-values,*/*', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || `coordinates/frequency/download: ${res.status} ${res.statusText}`)
   }
   return res.blob()
}

/**
 * GET ``/coordinates`` — paginated sample points; filter by ``taxid`` uses lineage containment
 * (same as ``server/helpers/geolocation.create_query``). Optional ``sample_accession`` narrows to one accession.
 */
export async function fetchSampleLocations(
   params: { taxid: string; limit?: number; offset?: number; sample_accession?: string },
): Promise<SampleCoordinatesPayload> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   sp.set('taxid', params.taxid)
   sp.set('limit', String(params.limit ?? 2000))
   sp.set('offset', String(params.offset ?? 0))
   const acc = params.sample_accession?.trim()
   if (acc) sp.set('sample_accession', acc)
   const url = `${base}/coordinates?${sp.toString()}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
   })
   if (!res.ok) {
      throw new Error(`coordinates: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as unknown
   if (!json || typeof json !== 'object') {
      return { total: 0, data: [] }
   }
   const o = json as Record<string, unknown>
   const total = typeof o.total === 'number' ? o.total : Number(o.total) || 0
   const data = Array.isArray(o.data) ? (o.data as Record<string, unknown>[]) : []
   return { total, data }
}

export type ParsedSampleLocation = {
   lat: number
   lng: number
   sampleAccession: string
   isLocalSample: boolean
}

/** Coerce BSON / JSON number wrappers to finite numbers. */
function coordNum(v: unknown): number {
   if (typeof v === 'number' && Number.isFinite(v)) return v
   if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      const d = o.$numberDouble ?? o.$numberDecimal
      if (typeof d === 'string' || typeof d === 'number') {
         const n = Number(d)
         if (Number.isFinite(n)) return n
      }
      const l = o.$numberLong
      if (typeof l === 'string' || typeof l === 'number') {
         const n = Number(l)
         if (Number.isFinite(n)) return n
      }
   }
   if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
   }
   return NaN
}

/**
 * Interpret a coordinate pair as lng/lat (GeoJSON / MongoDB) with fallback when ``type`` is missing.
 */
function lngLatFromPair(a: number, b: number, typeRaw: unknown): { lng: number; lat: number } | null {
   const t = typeof typeRaw === 'string' ? typeRaw.toLowerCase() : ''
   if (t === 'point') {
      return { lng: a, lat: b }
   }
   const geoOk = Math.abs(a) <= 180 && Math.abs(b) <= 90
   const swapOk = Math.abs(b) <= 180 && Math.abs(a) <= 90
   if (geoOk && !swapOk) return { lng: a, lat: b }
   if (swapOk && !geoOk) return { lng: b, lat: a }
   if (geoOk && swapOk) return { lng: a, lat: b }
   return null
}

/** GeoJSON Point on a SampleCoordinates document (``coordinates`` field). */
export function parseSampleLocationRow(row: Record<string, unknown>): ParsedSampleLocation | null {
   const loc = row.coordinates
   if (!loc || typeof loc !== 'object') return null
   const o = loc as Record<string, unknown>
   const coords = o.coordinates
   if (!Array.isArray(coords) || coords.length < 2) return null
   const a = coordNum(coords[0])
   const b = coordNum(coords[1])
   if (!Number.isFinite(a) || !Number.isFinite(b)) return null
   const pair = lngLatFromPair(a, b, o.type)
   if (!pair) return null
   return {
      lat: pair.lat,
      lng: pair.lng,
      sampleAccession: String(row.sample_accession ?? '').trim() || '—',
      isLocalSample: row.is_local_sample === true,
   }
}

export function parseSampleLocationsPayload(data: Record<string, unknown>[]): ParsedSampleLocation[] {
   const out: ParsedSampleLocation[] = []
   for (const row of data) {
      const p = parseSampleLocationRow(row)
      if (p) out.push(p)
   }
   return out
}
