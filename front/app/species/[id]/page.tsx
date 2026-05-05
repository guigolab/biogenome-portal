import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OrganismImagesCarousel } from '@/components/organism-images-carousel'
import { SpeciesIucnSection } from '@/components/species-iucn-section'
import { SpeciesLocationsMap } from '@/components/species-locations-map'
import { SpeciesPageStatsStrip } from '@/components/species-page-stats-strip'
import { SpeciesGoatPipelineSection } from '@/components/species-goat-pipeline-section'
import { fetchSampleLocations, parseSampleLocationsPayload } from '@/lib/api/coordinates'
import { fetchTaxonAncestors } from '@/lib/api/taxon'
import { fetchOrganism } from '@/lib/api/organisms'
import { publicationExternalUrl } from '@/lib/publicationLinks'
import { loadPortalConfigFromDisk } from '@/lib/portal/portalServer'
import { buildSpeciesDetailView, parseOrganismImages } from '@/lib/species-detail-from-organism'
import { getRootTaxid } from '@/lib/api/taxon'
import { taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import {
  buildClassificationRows,
  filterAncestorsFromPortalRoot,
  parseTaxonAncestors,
  type AncestryNode,
} from '@/lib/species-lineage'
import { countryLabelEn } from '@/lib/countryLabels'
import { showCountriesUi } from '@/lib/portal'
import { ArrowLeft, MapPin, Dna, ExternalLink, BookOpen, Tags, Globe } from 'lucide-react'
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

function metadataEntries(meta: unknown): [string, string][] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return []
  const o = meta as Record<string, unknown>
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(o)) {
    if (v == null) continue
    if (typeof v === 'string' && v.trim() === '') continue
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const organism = await fetchOrganism(id)
  if (!organism) {
    return { title: 'Species' }
  }
  const scientific = str(organism.scientific_name)
  return {
    title: scientific || 'Species',
  }
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

  const [locationsPeek, ancestorRows] = await Promise.all([
    fetchSampleLocations({ taxid: id, limit: 1 }).catch(() => ({
      total: 0,
      data: [] as Record<string, unknown>[],
    })),
    fetchTaxonAncestors(id),
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

  const sequencingRaw = organism.sequencing_type
  const sequencingTypes = Array.isArray(sequencingRaw)
    ? (sequencingRaw as unknown[]).map((x) => str(x)).filter(Boolean)
    : str(sequencingRaw)
      ? [str(sequencingRaw)]
      : []
  const subProject = str(organism.sub_project)
  const metaPairs = metadataEntries(organism.metadata)
  const showProjectBlock = Boolean(subProject) || sequencingTypes.length > 0
  const showMetadataBlock = metaPairs.length > 0

  const linkUrls: string[] = []
  if (Array.isArray(organism.links)) {
    for (const u of organism.links) {
      const s = str(u)
      if (s) linkUrls.push(s)
    }
  }

  const countryCodes: string[] = []
  if (Array.isArray(organism.countries)) {
    for (const c of organism.countries) {
      const s = str(c)
      if (s) countryCodes.push(s)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/species">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Species List
          </Link>
        </Button>

        <div className="mb-3 text-sm">
          {lineageAncestors.length > 0 ? (
            <LineageBreadcrumb ancestors={lineageAncestors} currentTaxid={detail.taxonId} />
          ) : (
            <FallbackLineageLabels detail={detail} />
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{detail.scientificName}</h1>
                <Badge className={cn(detail.conservationBadge.className)}>
                  {detail.conservationBadge.label}
                </Badge>
              </div>
              <p className="text-xl text-muted-foreground">{detail.commonName}</p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
              <div className="text-sm text-muted-foreground">Taxon ID: {detail.taxonId}</div>
            </div>
          </div>

          <SpeciesPageStatsStrip
            taxid={id}
            assemblyCount={assemblyCount}
            biosampleCount={biosampleCount}
            readsCount={readsCount}
            locationsTotal={locationsTotal}
            hasMapCoords={hasMapCoords}
          />
        </div>

        {goatPortalEnabled ? (
          <SpeciesGoatPipelineSection
            goatStatusRaw={organism.goat_status}
            targetListStatusRaw={organism.target_list_status}
          />
        ) : null}

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

        {showProjectBlock || showMetadataBlock ? (
          <div className={cn('mb-6 grid gap-4', showProjectBlock && showMetadataBlock ? 'lg:grid-cols-2' : '')}>
            {showProjectBlock ? (
              <Card>
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
                </CardContent>
              </Card>
            ) : null}
            {showMetadataBlock ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metadata</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            ) : null}
          </div>
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

        {showCountriesUi() && countryCodes.length > 0 ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {countryCodes.map((code) => (
                  <Badge key={code} variant="secondary" title={code}>
                    {countryLabelEn(code)}
                  </Badge>
                ))}
              </div>
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
          <CardContent className="space-y-4">
            {linkUrls.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Links from record</p>
                <ul className="space-y-2">
                  {linkUrls.map((href, idx) => (
                    <li key={`${href}#${idx}`}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-start gap-1.5 break-all"
                      >
                        <span className="min-w-0">{href}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              {linkUrls.length > 0 ? (
                <p className="text-xs text-muted-foreground mb-2">Suggested resources</p>
              ) : null}
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
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
