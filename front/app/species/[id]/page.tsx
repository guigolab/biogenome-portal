import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrganismImagesCarousel } from '@/components/organism-images-carousel'
import { SpeciesIucnSection } from '@/components/species-iucn-section'
import { SpeciesLocationsMap } from '@/components/species-locations-map'
import {
   fetchSampleLocations,
   parseSampleLocationsPayload,
} from '@/lib/api/coordinates'
import { fetchOrganism, fetchOrganismRelated } from '@/lib/api/organisms'
import {
  buildSpeciesDetailView,
  parseOrganismImages,
  sequencingStatusColors,
} from '@/lib/species-detail-from-organism'
import {
  ArrowLeft,
  Database,
  FlaskConical,
  MapPin,
  Dna,
  ExternalLink,
  PlayCircle,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function SpeciesDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const organism = await fetchOrganism(id)
  if (!organism) {
    notFound()
  }

  const [assembliesRaw, biosamplesRaw, readsRaw, locationsPayload] = await Promise.all([
    fetchOrganismRelated(id, 'assemblies'),
    fetchOrganismRelated(id, 'biosamples'),
    fetchOrganismRelated(id, 'reads'),
    fetchSampleLocations({ taxid: id, limit: 2500 }).catch(() => ({ total: 0, data: [] as Record<string, unknown>[] })),
  ])

  const detail = buildSpeciesDetailView(organism, assembliesRaw, biosamplesRaw, readsRaw)
  const { genomes, biosamples, runs } = detail
  const organismImages = parseOrganismImages(organism)

  const sampleLocations = parseSampleLocationsPayload(locationsPayload.data)
  const locationsTotal =
    typeof locationsPayload.total === 'number' && locationsPayload.total > 0
      ? locationsPayload.total
      : sampleLocations.length
  const mapPoints = sampleLocations.map((p) => ({ lat: p.lat, lng: p.lng }))

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
      value: detail.genomeCount,
      label: 'Genomes',
      iconWrapClass: 'bg-primary/10',
      iconClass: 'text-primary',
    },
    {
      key: 'biosamples',
      icon: FlaskConical,
      value: detail.sampleCount,
      label: 'Biosamples',
      iconWrapClass: 'bg-chart-2/10',
      iconClass: 'text-chart-2',
    },
    {
      key: 'locations',
      icon: MapPin,
      value: locationsTotal,
      label: 'Locations',
      iconWrapClass: 'bg-chart-3/10',
      iconClass: 'text-chart-3',
    },
    {
      key: 'runs',
      icon: PlayCircle,
      value: runs.length,
      label: 'Seq. Runs',
      iconWrapClass: 'bg-chart-4/10',
      iconClass: 'text-chart-4',
    },
  ]
  const statsStrip = statCandidates.filter((s) => s.value > 0)
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
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/species">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Species List
          </Link>
        </Button>

        {/* Header */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{detail.scientificName}</h1>
                <Badge className={cn(detail.conservationBadge.className)}>
                  {detail.conservationBadge.label}
                </Badge>
              </div>
              <p className="text-xl text-muted-foreground mb-4">{detail.commonName}</p>
              
              {/* Taxonomy Path */}
              <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{detail.kingdom}</span>
                <span>&gt;</span>
                <span>{detail.phylum}</span>
                <span>&gt;</span>
                <span>{detail.class}</span>
                <span>&gt;</span>
                <span>{detail.order}</span>
                <span>&gt;</span>
                <span>{detail.family}</span>
                <span>&gt;</span>
                <span className="font-medium text-foreground">{detail.genus}</span>
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-2">
              <Badge 
                className={cn('text-sm', sequencingStatusColors[detail.sequencingStatus])}
              >
                {detail.sequencingLabel}
              </Badge>
              <div className="text-sm text-muted-foreground">
                Taxon ID: {detail.taxonId}
              </div>
            </div>
          </div>

          {/* Stats: only metrics with count > 0 */}
          {statsStrip.length > 0 ? (
            <div
              className={cn('grid gap-4 mt-6 pt-6 border-t border-border', statsGridClass)}
            >
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

        <OrganismImagesCarousel
          images={organismImages}
          title={detail.scientificName}
        />

        {/* Tabs for detailed data — related tabs only when count > 0 */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {genomes.length > 0 ? (
              <TabsTrigger value="genomes">Genomes ({genomes.length})</TabsTrigger>
            ) : null}
            {biosamples.length > 0 ? (
              <TabsTrigger value="biosamples">Biosamples ({biosamples.length})</TabsTrigger>
            ) : null}
            {runs.length > 0 ? (
              <TabsTrigger value="runs">Sequencing Runs ({runs.length})</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Classification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Dna className="h-5 w-5 text-primary" />
                    Classification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    {[
                      { label: 'Kingdom', value: detail.kingdom },
                      { label: 'Phylum', value: detail.phylum },
                      { label: 'Class', value: detail.class },
                      { label: 'Order', value: detail.order },
                      { label: 'Family', value: detail.family },
                      { label: 'Genus', value: detail.genus },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <dt className="text-muted-foreground">{item.label}</dt>
                        <dd className="font-medium">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <SpeciesIucnSection organism={organism} scientificName={detail.scientificName} />
            </div>

            {/* Map: sample coordinates from GET /coordinates (lineage filter by taxid) */}
            {mapPoints.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-chart-3" />
                    Sample locations map
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SpeciesLocationsMap points={mapPoints} />
                  <p className="text-xs text-muted-foreground">
                    {locationsTotal.toLocaleString()} georeferenced sample
                    {locationsTotal === 1 ? '' : 's'} in the portal catalog for this lineage (including
                    biosamples and local samples).
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

            {/* Locations list (same API-backed points as the map) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-chart-3" />
                  Sample locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sampleLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No georeferenced sample coordinates in the catalog for this taxon yet.
                    </p>
                  ) : (
                    sampleLocations.map((loc) => (
                      <div
                        key={`${loc.sampleAccession}-${loc.lat}-${loc.lng}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2 bg-secondary/50 rounded-md"
                      >
                        <span className="text-sm font-mono">{loc.sampleAccession}</span>
                        <span className="text-xs text-muted-foreground sm:text-sm sm:font-mono">
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          {loc.isLocalSample ? (
                            <span className="ml-2 text-muted-foreground">(local)</span>
                          ) : null}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {locationsPayload.total > sampleLocations.length ? (
                  <p className="text-xs text-muted-foreground mt-3">
                    Showing {sampleLocations.length} of {locationsPayload.total.toLocaleString()} rows returned in
                    this request; increase the API limit if you need the full set in the UI.
                  </p>
                ) : null}
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link href="/map">
                    <MapPin className="h-4 w-4 mr-2" />
                    View on Map
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* External Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  External Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${detail.taxonId}`} target="_blank" rel="noopener noreferrer">
                      NCBI Taxonomy
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://www.gbif.org/species/search?q=${encodeURIComponent(detail.scientificName)}`} target="_blank" rel="noopener noreferrer">
                      GBIF
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://www.iucnredlist.org/search?query=${encodeURIComponent(detail.scientificName)}`} target="_blank" rel="noopener noreferrer">
                      IUCN Red List
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {genomes.length > 0 ? (
            <TabsContent value="genomes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Genome Assemblies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Accession</TableHead>
                        <TableHead>Assembly Level</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>GC %</TableHead>
                        <TableHead>N50</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {genomes.map((genome) => (
                        <TableRow key={genome.id}>
                          <TableCell className="font-mono text-sm">
                            <a 
                              href={`https://www.ncbi.nlm.nih.gov/assembly/${genome.accession}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {genome.accession}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{genome.assemblyLevel}</Badge>
                          </TableCell>
                          <TableCell>{genome.size}</TableCell>
                          <TableCell>
                            {genome.gcContent === '—' ? '—' : `${genome.gcContent}%`}
                          </TableCell>
                          <TableCell>{genome.n50}</TableCell>
                          <TableCell className="text-muted-foreground">{genome.submissionDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}

          {biosamples.length > 0 ? (
            <TabsContent value="biosamples">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-chart-2" />
                    Biosamples
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Accession</TableHead>
                        <TableHead>Tissue</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Collector</TableHead>
                        <TableHead>Collected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {biosamples.map((sample) => (
                        <TableRow key={sample.id}>
                          <TableCell className="font-mono text-sm">
                            <a 
                              href={`https://www.ncbi.nlm.nih.gov/biosample/${sample.accession}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {sample.accession}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell>{sample.tissue}</TableCell>
                          <TableCell className="max-w-48 truncate">{sample.location}</TableCell>
                          <TableCell className="max-w-32 truncate">{sample.collector}</TableCell>
                          <TableCell className="text-muted-foreground">{sample.collectionDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}

          {runs.length > 0 ? (
            <TabsContent value="runs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-chart-4" />
                    Sequencing Runs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Accession</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Reads</TableHead>
                        <TableHead>Bases</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-mono text-sm">
                            <a 
                              href={`https://www.ncbi.nlm.nih.gov/sra/${run.accession}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {run.accession}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell>{run.platform}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{run.libraryStrategy}</Badge>
                          </TableCell>
                          <TableCell>{(run.readCount / 1000000).toFixed(0)}M</TableCell>
                          <TableCell>{run.baseCount}</TableCell>
                          <TableCell className="text-muted-foreground">{run.submissionDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  )
}
