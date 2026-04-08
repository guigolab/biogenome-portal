/**
 * Extract human-readable annotation summaries from GenomeAnnotation metadata (Annotrieve-style).
 */

import type { GenomeAnnotationRow } from '@/lib/api/assemblies'

function str(v: unknown): string {
   if (v == null) return ''
   return String(v).trim()
}

function num(v: unknown): number | undefined {
   if (typeof v === 'number' && Number.isFinite(v)) return v
   if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
   }
   return undefined
}

export type AnnotationOverview = {
   genesTotal?: number
   mrnaTotal?: number
   codingGenes?: number
   busco?: {
      lineage?: string
      complete?: number
      singleCopy?: number
      duplicated?: number
      fragmented?: number
      missing?: number
      total?: number
   }
}

export function annotationOverviewFromRow(row: GenomeAnnotationRow): AnnotationOverview {
   const meta = row.metadata
   if (!meta || typeof meta !== 'object') return {}

   const m = meta as Record<string, unknown>
   const buscoRaw = m.busco
   let busco: AnnotationOverview['busco']
   if (buscoRaw && typeof buscoRaw === 'object' && !Array.isArray(buscoRaw)) {
      const b = buscoRaw as Record<string, unknown>
      busco = {
         lineage: str(b.busco_lineage) || undefined,
         complete: num(b.complete),
         singleCopy: num(b.single_copy),
         duplicated: num(b.duplicated),
         fragmented: num(b.fragmented),
         missing: num(b.missing),
         total: num(b.total_count),
      }
   }

   const fs = m.features_statistics
   let genesTotal: number | undefined
   let mrnaTotal: number | undefined
   let codingGenes: number | undefined

   if (fs && typeof fs === 'object' && !Array.isArray(fs)) {
      const f = fs as Record<string, unknown>
      const geneCat = f.gene_category_stats
      if (geneCat && typeof geneCat === 'object' && !Array.isArray(geneCat)) {
         const gc = geneCat as Record<string, unknown>
         const coding = gc.coding
         if (coding && typeof coding === 'object' && !Array.isArray(coding)) {
            codingGenes = num((coding as Record<string, unknown>).total_count)
         }
         const nc = gc.non_coding
         const pseudo = gc.pseudogene
         let nonCoding = 0
         let pseudoN = 0
         if (nc && typeof nc === 'object') nonCoding = num((nc as Record<string, unknown>).total_count) ?? 0
         if (pseudo && typeof pseudo === 'object')
            pseudoN = num((pseudo as Record<string, unknown>).total_count) ?? 0
         if (codingGenes != null) {
            genesTotal = codingGenes + nonCoding + pseudoN
         }
      }

      const tt = f.transcript_type_stats
      if (tt && typeof tt === 'object' && !Array.isArray(tt)) {
         const mRNA = (tt as Record<string, unknown>).mRNA
         if (mRNA && typeof mRNA === 'object' && !Array.isArray(mRNA)) {
            mrnaTotal = num((mRNA as Record<string, unknown>).total_count)
         }
      }
   }

   const summary = m.features_summary
   if (summary && typeof summary === 'object' && !Array.isArray(summary)) {
      const root = (summary as Record<string, unknown>).root_type_counts
      if (root && typeof root === 'object' && genesTotal == null) {
         const r = root as Record<string, unknown>
         const g = num(r.gene)
         const nc = num(r.ncRNA_gene)
         const p = num(r.pseudogene)
         if (g != null || nc != null || p != null) {
            genesTotal = (g ?? 0) + (nc ?? 0) + (p ?? 0)
         }
      }
   }

   return { genesTotal, mrnaTotal, codingGenes, busco }
}

export type SourceFileInfo = {
   database?: string
   provider?: string
   urlPath?: string
   releaseDate?: string
   lastModified?: string
   pipelineName?: string
   pipelineVersion?: string
   uncompressedMd5?: string
}

export function sourceFileInfoFromMetadata(meta: Record<string, unknown> | undefined): SourceFileInfo {
   if (!meta) return {}
   const raw = meta.source_file_info
   if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
   const s = raw as Record<string, unknown>
   const pipe = s.pipeline
   let pipelineName: string | undefined
   let pipelineVersion: string | undefined
   if (pipe && typeof pipe === 'object' && !Array.isArray(pipe)) {
      const p = pipe as Record<string, unknown>
      pipelineName = str(p.name) || undefined
      pipelineVersion = str(p.version) || undefined
   }
   return {
      database: str(s.database) || undefined,
      provider: str(s.provider) || undefined,
      urlPath: str(s.url_path) || undefined,
      releaseDate: str(s.release_date) || undefined,
      lastModified: str(s.last_modified) || undefined,
      pipelineName,
      pipelineVersion,
      uncompressedMd5: str(s.uncompressed_md5) || undefined,
   }
}

export type IndexedFileInfo = {
   fileSize?: number
   processedAt?: string
   uncompressedMd5?: string
}

export function indexedFileInfoFromMetadata(meta: Record<string, unknown> | undefined): IndexedFileInfo {
   if (!meta) return {}
   const raw = meta.indexed_file_info
   if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
   const s = raw as Record<string, unknown>
   return {
      fileSize: num(s.file_size),
      processedAt: str(s.processed_at) || undefined,
      uncompressedMd5: str(s.uncompressed_md5) || undefined,
   }
}
