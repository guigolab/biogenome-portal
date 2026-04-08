import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OrganismImagesCarousel } from '@/components/organism-images-carousel'
import { SpeciesIucnSection } from '@/components/species-iucn-section'
import { SpeciesLocationsMap } from '@/components/species-locations-map'
import { SpeciesRelatedRecordsTabs, type RelatedCatalogModel } from '@/components/species-related-records-tabs'
import { fetchSampleLocations, parseSampleLocationsPayload } from '@/lib/api/coordinates'
import { fetchTaxonAncestors } from '@/lib/api/taxon'
import { fetchOrganism, fetchOrganismRelatedWithTotal } from '@/lib/api/organisms'
import { fetchJBrowseSessions } from '@/lib/api/jbrowse'
import { publicationExternalUrl } from '@/lib/publicationLinks'
import { loadPortalConfigFromDisk } from '@/lib/portal/portalServer'
import {
  buildSpeciesDetailView,
  parseOrganismImages,
  sequencingStatusColors,
} from '@/lib/species-detail-from-organism'
import { getRootTaxid } from '@/lib/api/taxon'
import { taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import {
  buildClassificationRows,
  filterAncestorsFromPortalRoot,
  parseTaxonAncestors,
  type AncestryNode,
} from '@/lib/species-lineage'
import {
  ArrowLeft,
  Database,
  FlaskConical,
  MapPin,
  Dna,
  ExternalLink,
  PlayCircle,
  Globe,
  BookOpen,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function str(v: unknown): string {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

function nonNegInt(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v)
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }
  return 0
}

function formatTargetListStatus(v: unknown): string {
  const s = str(v)
  if (!s) return ''
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function metadataEntries(meta: unknown): [string, string][] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return []
  const o = meta as Record<string, unknown>
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(o)) {
    if (v == null || v === '') continue
    if (typeof v === 'object') {
      try {
        out.push([k, JSON.stringify(v)])
      } catch {
        out.push([k, String(v)])
      }
    } else {
      out.push([k, String(v)])
    }
  }
  return out.sort(([a], [b]) => a.localeCompare(b))
}

function LineageBreadcrumb({
  ancestors,
  currentTaxid,
}: {
  ancestors: AncestryNode[]
  currentTaxid: string
}) {
  if (ancestors.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted-foreground">
      {ancestors.map((node, i) => {
        const isLast =
          i === ancestors.length - 1 || (currentTaxid && node.taxid === currentTaxid)
        return (
          <span key={`${node.taxid}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? <span className="text-muted-foreground/70 px-0.5">›</span> : null}
            {isLast ? (
              <span className="font-medium text-foreground">{node.name}</span>
            ) : (
              <Link href={taxonomyTaxonHref(node.taxid)} className="hover:text-foreground hover:underline">
                {node.name}
              </Link>
            )}
          </span>
        )
      })}
    </div>
  )
}

function FallbackLineageLabels({
  detail,
}: {
  detail: {
    kingdom: string
    phylum: string
    class: string
    order: string
    family: string
    genus: string
  }
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{detail.kingdom}</span>
      <span>›</span>
      <span>{detail.phylum}</span>
      <span>›</span>
      <span>{detail.class}</span>
      <span>›</span>
      <span>{detail.order}</span>
      <span>›</span>
      <span>{detail.family}</span>
      <span>›</span>
      <span className="font-medium text-foreground">{detail.genus}</span>
    </div>
  )
}

function ClassificationCard({
  rows,
  className,
}: {
  rows: { label: string; value: string; taxid: string | null }[]
  className?: string
}) {
  return (
    <Card className={cn('min-h-0 h-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Dna className="h-5 w-5 text-primary" />
          Classification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {rows.map((item) => (
            <div key={item.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="font-medium text-right">
                {item.taxid && item.value !== '—' ? (
                  <Link href={taxonomyTaxonHref(item.taxid)} className="text-primary hover:underline">
                    {item.value}
                  </Link>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function pickDefaultRelatedModel(
  assemblyCount: number,
  biosampleCount: number,
  readsCount: number,
): RelatedCatalogModel | null {
  if (assemblyCount > 0) return 'assemblies'
  if (biosampleCount > 0) return 'biosamples'
  if (readsCount > 0) return 'reads'
  return null
}

export default async function SpeciesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const portal = await loadPortalConfigFromDisk()
  const goatPortalEnabled =
    portal?.general && typeof portal.general === 'object' && 'goat' in portal.general
      ? (portal.general as { goat?: boolean }).goat === true
      : false

  const organism = await fetchOrganism(id)
  if (!organism) {
    notFound()
  }

  const assemblyCount = nonNegInt(organism.assemblies_count)
  const biosampleCount = nonNegInt(organism.biosamples_count)
  const readsCount = nonNegInt(organism.reads_count)
  const defaultRelatedModel = pickDefaultRelatedModel(assemblyCount, biosampleCount, readsCount)
  const hasCatalogRecords =
    assemblyCount > 0 || biosampleCount > 0 || readsCount > 0

  const [relatedInitial, locationsPeek, ancestorRows, jbrowseSessions] = await Promise.all([
    hasCatalogRecords && defaultRelatedModel
      ? fetchOrganismRelatedWithTotal(id, defaultRelatedModel, { limit: 200, offset: 0 })
      : Promise.resolve({ data: [] as Record<string, unknown>[], total: 0 }),
    fetchSampleLocations({ taxid: id, limit: 1 }).catch(() => ({
      total: 0,
      data: [] as Record<string, unknown>[],
    })),
    fetchTaxonAncestors(id),
    fetchJBrowseSessions({ taxon_lineage: id, limit: 200 }).catch(() => ({ total: 0, data: [] })),
  ])

  let locationsPayload = locationsPeek
  const peekTotal =
    typeof locationsPeek.total === 'number' && locationsPeek.total > 0
      ? locationsPeek.total
      : parseSampleLocationsPayload(locationsPeek.data).length
  const hasMapCoords = peekTotal > 0

  if (hasMapCoords && peekTotal > 1) {
    locationsPayload = await fetchSampleLocations({ taxid: id, limit: 2500 }).catch(() => locationsPeek)
  }

  const ancestors = parseTaxonAncestors(ancestorRows)
  const detail = buildSpeciesDetailView(organism, [], [], [])
  const portalRootTaxid =
    portal?.general && typeof portal.general === 'object' && 'rootTaxid' in portal.general
      ? str((portal.general as { rootTaxid?: string }).rootTaxid)
      : ''
  const lineageAncestors = filterAncestorsFromPortalRoot(
    ancestors,
    portalRootTaxid || getRootTaxid(),
  )
  const classificationRows = buildClassificationRows(detail, lineageAncestors)
  const organismImages = parseOrganismImages(organism)

  const sampleLocations = parseSampleLocationsPayload(locationsPayload.data)
  const locationsTotal =
    typeof locationsPayload.total === 'number' && locationsPayload.total > 0
      ? locationsPayload.total
      : sampleLocations.length
  const mapPoints = sampleLocations.map((p) => ({ lat: p.lat, lng: p.lng }))

  const publicationsRaw = organism.publications
  const publications: { source: string; id: string }[] = []
  if (Array.isArray(publicationsRaw)) {
    for (const p of publicationsRaw) {
      if (!p || typeof p !== 'object') continue
      const o = p as Record<string, unknown>
      const source = str(o.source)
      const pid = str(o.id)
      if (pid) publications.push({ source: source || 'Publication', id: pid })
    }
  }

  const commonNamesRaw = organism.common_names
  const commonNames: { value: string; lang?: string; locality?: string }[] = []
  if (Array.isArray(commonNamesRaw)) {
    for (const n of commonNamesRaw) {
      if (!n || typeof n !== 'object') continue
      const o = n as Record<string, unknown>
      const value = str(o.value)
      if (!value) continue
      commonNames.push({
        value,
        lang: str(o.lang) || undefined,
        locality: str(o.locality) || undefined,
      })
    }
  }

  const sequencingTypes = Array.isArray(organism.sequencing_type)
    ? (organism.sequencing_type as unknown[]).map((x) => str(x)).filter(Boolean)
    : []
  const subProject = str(organism.sub_project)
  const metaPairs = metadataEntries(organism.metadata)
  const showProjectBlock =
    Boolean(subProject) || sequencingTypes.length > 0 || metaPairs.length > 0

  const goatStatus = str(organism.goat_status)
  const targetListStatus = formatTargetListStatus(organism.target_list_status)

  type StatItem = {
    key: string
    icon: LucideIcon
    value: number
    label: string
    iconWrapClass: string
    iconClass: string
  }

  const statCandidates: StatItem[] = [
    {
      key: 'genomes',
      icon: Database,
      value: assemblyCount,
      label: 'Genomes',
      iconWrapClass: 'bg-primary/10',
      iconClass: 'text-primary',
    },
    {
      key: 'biosamples',
      icon: FlaskConical,
      value: biosampleCount,
      label: 'Biosamples',
      iconWrapClass: 'bg-chart-2/10',
      iconClass: 'text-chart-2',
    },
    {
      key: 'locations',
      icon: MapPin,
      value: hasMapCoords ? locationsTotal : 0,
      label: 'Locations',
      iconWrapClass: 'bg-chart-3/10',
      iconClass: 'text-chart-3',
    },
    {
      key: 'runs',
      icon: PlayCircle,
      value: readsCount,
      label: 'Seq. Runs',
      iconWrapClass: 'bg-chart-4/10',
      iconClass: 'text-chart-4',
    },
  ]
  const statsStrip = statCandidates.filter((s) => s.value > 0)
  const browserableAccessions = jbrowseSessions.data.map((s) => s.accession)
  const statsGridClass =
    statsStrip.length <= 1
      ? 'grid-cols-1 max-w-xs'
      : statsStrip.length === 2
        ? 'grid-cols-2'
        : statsStrip.length === 3
          ? 'grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-2 lg:grid-cols-4'

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/species">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Species List
          </Link>
        </Button>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{detail.scientificName}</h1>
                <Badge className={cn(detail.conservationBadge.className)}>
                  {detail.conservationBadge.label}
                </Badge>
              </div>
              <p className="text-xl text-muted-foreground mb-3">{detail.commonName}</p>

              {goatPortalEnabled && (goatStatus || targetListStatus) ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {goatStatus ? (
                    <Badge variant="secondary" className="font-normal">
                      GoaT: {goatStatus}
                    </Badge>
                  ) : null}
                  {targetListStatus ? (
                    <Badge variant="outline" className="font-normal">
                      Target list: {targetListStatus}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              {lineageAncestors.length > 0 ? (
                <LineageBreadcrumb ancestors={lineageAncestors} currentTaxid={detail.taxonId} />
              ) : (
                <FallbackLineageLabels detail={detail} />
              )}
            </div>

            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
              <Badge className={cn('text-sm', sequencingStatusColors[detail.sequencingStatus])}>
                {detail.sequencingLabel}
              </Badge>
              <div className="text-sm text-muted-foreground">Taxon ID: {detail.taxonId}</div>
            </div>
          </div>

          {statsStrip.length > 0 ? (
            <div className={cn('grid gap-4 mt-6 pt-6 border-t border-border', statsGridClass)}>
              {statsStrip.map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', s.iconWrapClass)}>
                      <Icon className={cn('h-5 w-5', s.iconClass)} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            'grid gap-4 mb-6 items-stretch',
            organismImages.length > 0 ? 'lg:grid-cols-2' : '',
          )}
        >
          {organismImages.length > 0 ? (
            <OrganismImagesCarousel
              compact
              images={organismImages}
              title={detail.scientificName}
              className="min-h-0"
            />
          ) : null}
          <ClassificationCard
            rows={classificationRows}
            className={organismImages.length === 0 ? 'lg:col-span-2' : undefined}
          />
        </div>

        <div className="mb-6">
          <SpeciesIucnSection organism={organism} scientificName={detail.scientificName} />
        </div>

        {showProjectBlock ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Project &amp; sequencing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {subProject ? (
                <div>
                  <div className="text-muted-foreground mb-1">Sub-project</div>
                  <p className="font-medium">{subProject}</p>
                </div>
              ) : null}
              {sequencingTypes.length > 0 ? (
                <div>
                  <div className="text-muted-foreground mb-2">Sequencing type</div>
                  <div className="flex flex-wrap gap-2">
                    {sequencingTypes.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {metaPairs.length > 0 ? (
                <div>
                  <div className="text-muted-foreground mb-2">Metadata</div>
                  <dl className="space-y-2">
                    {metaPairs.map(([k, v]) => (
                      <div
                        key={k}
                        className="flex flex-col sm:flex-row sm:gap-4 border-t border-border pt-2 first:border-0 first:pt-0"
                      >
                        <dt className="text-muted-foreground shrink-0 sm:w-40 font-mono text-xs">{k}</dt>
                        <dd className="font-mono text-xs break-all">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {publications.length > 0 ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Publications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {publications.map((pub, idx) => {
                  const href = publicationExternalUrl(pub.source, pub.id)
                  return (
                    <li
                      key={`${pub.source}-${pub.id}-${idx}`}
                      className="flex flex-wrap items-baseline gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">{pub.source}:</span>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 font-mono"
                        >
                          {pub.id}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-mono">{pub.id}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {commonNames.length > 0 ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" />
                Vernacular names
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {commonNames.map((n, idx) => (
                  <li key={`${n.value}-${idx}`} className="py-2 first:pt-0 last:pb-0 text-sm">
                    <span className="font-medium">{n.value}</span>
                    {(n.lang || n.locality) && (
                      <span className="text-muted-foreground ml-2">
                        {[n.lang, n.locality].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {hasMapCoords && mapPoints.length > 0 ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-chart-3" />
                Sample locations map
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SpeciesLocationsMap points={mapPoints} className="h-[320px] w-full" />
              <p className="text-xs text-muted-foreground">
                {locationsTotal.toLocaleString()} georeferenced sample
                {locationsTotal === 1 ? '' : 's'} in the portal catalog for this lineage (including biosamples and
                local samples).
                {typeof locationsPayload.total === 'number' &&
                locationsPayload.total > sampleLocations.length ? (
                  <>
                    {' '}
                    Showing {sampleLocations.length.toLocaleString()} of{' '}
                    {locationsPayload.total.toLocaleString()} in this request.
                  </>
                ) : null}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/map">
                  <Globe className="h-4 w-4 mr-2" />
                  Explore full map
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              External Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${detail.taxonId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  NCBI Taxonomy
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://www.gbif.org/species/search?q=${encodeURIComponent(detail.scientificName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GBIF
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://www.iucnredlist.org/search?query=${encodeURIComponent(detail.scientificName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  IUCN Red List
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasCatalogRecords && defaultRelatedModel ? (
          <SpeciesRelatedRecordsTabs
            taxid={id}
            counts={{
              assemblies: assemblyCount,
              biosamples: biosampleCount,
              reads: readsCount,
            }}
            defaultModel={defaultRelatedModel}
            initialRows={relatedInitial.data}
            browserableAccessions={browserableAccessions}
          />
        ) : null}
      </div>
    </div>
  )
}
