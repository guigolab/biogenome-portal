'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchOrganismRelatedWithTotal, type OrganismRelatedModel } from '@/lib/api/organisms'
import {
  assemblyFromDoc,
  biosampleFromDoc,
  readRunFromDoc,
} from '@/lib/species-detail-from-organism'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExternalLink, Layers } from 'lucide-react'

export type RelatedCatalogModel = OrganismRelatedModel

type Counts = {
  assemblies: number
  biosamples: number
  reads: number
}

type SpeciesRelatedRecordsTabsProps = {
  taxid: string
  counts: Counts
  /** First model in assemblies → biosamples → reads with count &gt; 0. */
  defaultModel: RelatedCatalogModel
  initialRows: Record<string, unknown>[]
  /** Accessions for which a JBrowse session exists; shows a "Browse" button when present. */
  browserableAccessions?: string[]
}

const TAB_BODY_CLASS = 'h-[min(28rem,58vh)] overflow-y-auto overflow-x-auto'

export function SpeciesRelatedRecordsTabs({
  taxid,
  counts,
  defaultModel,
  initialRows,
  browserableAccessions,
}: SpeciesRelatedRecordsTabsProps) {
  const [cache, setCache] = useState<Record<RelatedCatalogModel, Record<string, unknown>[] | null>>({
    assemblies: defaultModel === 'assemblies' ? initialRows : null,
    biosamples: defaultModel === 'biosamples' ? initialRows : null,
    reads: defaultModel === 'reads' ? initialRows : null,
  })
  const cacheRef = useRef(cache)
  useEffect(() => {
    cacheRef.current = cache
  }, [cache])

  const [loading, setLoading] = useState<RelatedCatalogModel | null>(null)
  const [error, setError] = useState<string | null>(null)

  const browserableSet = useMemo(
    () => new Set(browserableAccessions ?? []),
    [browserableAccessions],
  )

  const ensureLoaded = useCallback(async (model: RelatedCatalogModel) => {
    if (cacheRef.current[model] != null) return
    setError(null)
    setLoading(model)
    try {
      const { data } = await fetchOrganismRelatedWithTotal(taxid, model, { limit: 200, offset: 0 })
      setCache((prev) => ({ ...prev, [model]: data }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(null)
    }
  }, [taxid])

  const onTabChange = (value: string) => {
    const model = value as RelatedCatalogModel
    if (counts.assemblies === 0 && model === 'assemblies') return
    if (counts.biosamples === 0 && model === 'biosamples') return
    if (counts.reads === 0 && model === 'reads') return
    void ensureLoaded(model)
  }

  const genomes = (cache.assemblies ?? []).map((r) => assemblyFromDoc(r))
  const biosamples = (cache.biosamples ?? []).map((r) => biosampleFromDoc(r))
  const runs = (cache.reads ?? []).map((r) => readRunFromDoc(r))

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Catalog records</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultModel} className="w-full" onValueChange={onTabChange}>
          <TabsList className="bg-muted/60 border border-border flex-wrap h-auto gap-1 p-1">
            {counts.assemblies > 0 ? (
              <TabsTrigger value="assemblies" className="text-xs sm:text-sm">
                Genomes ({counts.assemblies.toLocaleString()})
              </TabsTrigger>
            ) : null}
            {counts.biosamples > 0 ? (
              <TabsTrigger value="biosamples" className="text-xs sm:text-sm">
                Biosamples ({counts.biosamples.toLocaleString()})
              </TabsTrigger>
            ) : null}
            {counts.reads > 0 ? (
              <TabsTrigger value="reads" className="text-xs sm:text-sm">
                Sequencing runs ({counts.reads.toLocaleString()})
              </TabsTrigger>
            ) : null}
          </TabsList>

          {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}

          {counts.assemblies > 0 ? (
            <TabsContent value="assemblies" className="mt-4">
              <div className={TAB_BODY_CLASS}>
                {loading === 'assemblies' && cache.assemblies == null ? (
                  <p className="text-sm text-muted-foreground py-6">Loading assemblies…</p>
                ) : (
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
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://www.ncbi.nlm.nih.gov/assembly/${genome.accession}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {genome.accession}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                              {browserableSet.has(genome.accession) ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-6 px-1.5 text-xs gap-1 shrink-0"
                                >
                                  <Link href={`/genome-browser?assembly=${genome.accession}`}>
                                    <Layers className="h-3 w-3" />
                                    Browse
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
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
                )}
              </div>
            </TabsContent>
          ) : null}

          {counts.biosamples > 0 ? (
            <TabsContent value="biosamples" className="mt-4">
              <div className={TAB_BODY_CLASS}>
                {loading === 'biosamples' && cache.biosamples == null ? (
                  <p className="text-sm text-muted-foreground py-6">Loading biosamples…</p>
                ) : (
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
                )}
              </div>
            </TabsContent>
          ) : null}

          {counts.reads > 0 ? (
            <TabsContent value="reads" className="mt-4">
              <div className={TAB_BODY_CLASS}>
                {loading === 'reads' && cache.reads == null ? (
                  <p className="text-sm text-muted-foreground py-6">Loading sequencing runs…</p>
                ) : (
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
                )}
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      </CardContent>
    </Card>
  )
}
