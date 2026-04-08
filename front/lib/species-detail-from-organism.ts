import { iucnRedListBadge } from '@/lib/iucnCategory'
import { INSDC_STATUS_LABELS } from '@/lib/organismStatusLabels'
import {
  sequencingStatusColors,
  sequencingStatusLabels,
} from '@/lib/mock-data'

type SequencingKey =
  | 'not_started'
  | 'sample_collected'
  | 'sequencing'
  | 'assembly'
  | 'annotation'
  | 'completed'

const INSDC_TO_SEQUENCING: Record<string, SequencingKey> = {
  'No Entry': 'not_started',
  'Biosample Submitted': 'sample_collected',
  'Reads Submitted': 'sequencing',
  'Assemblies Submitted': 'assembly',
  'Annotation Completed': 'completed',
}

function mapInsdcToSequencingKey(insdc: string): SequencingKey {
  return INSDC_TO_SEQUENCING[insdc] ?? 'not_started'
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  const s = String(v).trim()
  return s || fallback
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/** GeoJSON Point or legacy { coordinates: [lng, lat] } from API. */
function pointToCoord(
  loc: unknown,
): { lat: number; lng: number } | null {
  if (!loc || typeof loc !== 'object') return null
  const o = loc as Record<string, unknown>
  const coords = o.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const a = Number(coords[0])
  const b = Number(coords[1])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  if (o.type === 'Point') return { lng: a, lat: b }
  return { lat: a, lng: b }
}

function formatBases(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Gb`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} Mb`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)} kb`
  return `${Math.round(n)} bp`
}

export function assemblyFromDoc(row: Record<string, unknown>) {
  const accession = str(row.accession)
  const meta = row.metadata
  const m = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {}
  const info = (m.assembly_info as Record<string, unknown> | undefined) ?? {}
  const stats = (m.assembly_stats as Record<string, unknown> | undefined) ?? {}
  const levelRaw = info.assembly_level
  const assemblyLevel = levelRaw != null ? str(levelRaw) : '—'
  const totalLen = num(info.total_sequence_length as number | string | undefined)
  const size = formatBases(totalLen)
  const gcCount = num(info.gc_count as number | string | undefined)
  let gcContent = '—'
  if (totalLen && gcCount != null && totalLen > 0) {
    gcContent = `${((gcCount / totalLen) * 100).toFixed(1)}`
  }
  const n50raw =
    stats.contig_n50 ?? stats.scaffold_n50 ?? stats.chromosome_n50 ?? stats.molecule_n50
  const n50 = n50raw != null ? formatBases(num(n50raw as number | string)) : '—'
  const created = row.created
  let submissionDate = '—'
  if (created != null) {
    if (typeof created === 'string') submissionDate = created.slice(0, 10)
    else if (typeof created === 'object' && created !== null && '$date' in created) {
      const d = (created as { $date?: string }).$date
      if (d) submissionDate = d.slice(0, 10)
    }
  }
  return {
    id: accession || 'assembly',
    accession: accession || '—',
    assemblyLevel,
    size,
    gcContent,
    n50,
    submissionDate,
  }
}

export function biosampleFromDoc(row: Record<string, unknown>) {
  const accession = str(row.accession)
  const meta = row.metadata
  const md = meta && typeof meta === 'object' ? (meta as Record<string, string>) : {}
  const tissue =
    md.tissue ||
    md.Tissue ||
    md.body_part ||
    md['body part'] ||
    '—'
  let location = '—'
  const pt = pointToCoord(row.location)
  if (pt) {
    location = `${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}`
  }
  const collector =
    md.collected_by ||
    md.collector ||
    md['collected by'] ||
    '—'
  return {
    id: accession || 'biosample',
    accession: accession || '—',
    tissue,
    location,
    collector,
    collectionDate: str(row.collection_date) || '—',
  }
}

export function readRunFromDoc(row: Record<string, unknown>) {
  const accession = str(row.run_accession)
  const meta = row.metadata
  const md = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {}
  const platform = str(
    md.instrument_platform ?? md.platform ?? md.INSTRUMENT_PLATFORM,
  )
  const libraryStrategy = str(
    md.library_strategy ?? md.library_layout ?? md.LIBRARY_STRATEGY ?? '—',
  )
  const readCount =
    num(md.read_count) ??
    num(md.spot_count) ??
    num(md.submitted_ftp) // fallback unlikely
  const baseCountRaw =
    num(md.base_count) ?? (readCount != null && num(md.avg_length) != null
      ? readCount * (num(md.avg_length) ?? 0)
      : undefined)
  const baseCount = formatBases(baseCountRaw)
  let submissionDate = '—'
  const first = md.first_public
  if (first != null) submissionDate = str(first).slice(0, 10)
  return {
    id: accession || 'run',
    accession: accession || '—',
    platform: platform || '—',
    libraryStrategy: libraryStrategy || '—',
    readCount: readCount ?? 0,
    baseCount,
    submissionDate,
  }
}

export type SpeciesDetailView = {
  scientificName: string
  commonName: string
  taxonId: string
  kingdom: string
  phylum: string
  class: string
  order: string
  family: string
  genus: string
  conservationBadge: { label: string; className: string }
  sequencingStatus: SequencingKey
  sequencingLabel: string
  genomeCount: number
  sampleCount: number
  coordinates: { lat: number; lng: number }[]
  genomes: ReturnType<typeof assemblyFromDoc>[]
  biosamples: ReturnType<typeof biosampleFromDoc>[]
  runs: ReturnType<typeof readRunFromDoc>[]
}

export function buildSpeciesDetailView(
  organism: Record<string, unknown>,
  assemblies: Record<string, unknown>[],
  biosamples: Record<string, unknown>[],
  readRuns: Record<string, unknown>[],
): SpeciesDetailView {
  const lr = organism.lineage_rank_labels
  const labels =
    lr && typeof lr === 'object' ? (lr as Record<string, unknown>) : {}

  const taxonId = str(organism.taxid)
  const scientificName = str(organism.scientific_name) || taxonId || 'Unknown'
  const commonName = str(organism.insdc_common_name) || scientificName

  const iucn = iucnRedListBadge(organism)
  const conservationBadge = iucn
    ? { label: iucn.title, className: iucn.className }
    : { label: 'No assessment', className: 'border-muted-foreground/40 bg-muted text-muted-foreground' }

  const insdc = str(organism.insdc_status)
  const sequencingStatus = mapInsdcToSequencingKey(insdc)
  const sequencingLabel = INSDC_STATUS_LABELS[insdc] || insdc || sequencingStatusLabels[sequencingStatus]

  const genomes = assemblies.map((r) => assemblyFromDoc(r))
  const biosampleRows = biosamples.map((r) => biosampleFromDoc(r))
  const runs = readRuns.map((r) => readRunFromDoc(r))

  const genomeCount =
    num(organism.assemblies_count) ?? genomes.length
  const sampleCount =
    num(organism.biosamples_count) ?? biosampleRows.length

  const coordinates: { lat: number; lng: number }[] = []
  for (const b of biosamples) {
    const c = pointToCoord(b.location)
    if (c) coordinates.push(c)
  }

  return {
    scientificName,
    commonName,
    taxonId,
    kingdom: str(labels.kingdom) || '—',
    phylum: str(labels.phylum) || '—',
    class: str(labels.class_name) || '—',
    order: str(labels.order) || '—',
    family: str(labels.family) || '—',
    genus: str(labels.genus) || '—',
    conservationBadge,
    sequencingStatus,
    sequencingLabel,
    genomeCount,
    sampleCount,
    coordinates,
    genomes,
    biosamples: biosampleRows,
    runs,
  }
}

export { sequencingStatusColors, sequencingStatusLabels }

/** One slide from Organism ``images`` (embedded OrganismImage) as returned by the API. */
export type OrganismImageSlide = {
  url: string
  author: string
  sourceRecordUrl: string
  license: string
  licenseUrl: string
}

/**
 * Parse ``organism.images`` (list of embedded docs: url, author, source_record_url, license, license_url).
 */
export function parseOrganismImages(organism: Record<string, unknown>): OrganismImageSlide[] {
  const raw = organism.images
  if (!Array.isArray(raw)) return []
  const out: OrganismImageSlide[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const url = str(o.url)
    if (!url) continue
    out.push({
      url,
      author: str(o.author),
      sourceRecordUrl: str(o.source_record_url),
      license: str(o.license) || 'License unknown',
      licenseUrl: str(o.license_url),
    })
  }
  return out
}
