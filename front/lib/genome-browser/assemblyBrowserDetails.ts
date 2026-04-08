/**
 * Rich assembly display helpers for the genome browser (metadata.assembly_stats, external links).
 */

function str(v: unknown): string {
   if (v == null) return ''
   return String(v).trim()
}

function fmtInt(v: unknown): string {
   if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v).toLocaleString()
   if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return Math.round(n).toLocaleString()
      return v
   }
   return ''
}

function fmtBpLike(v: unknown): string {
   if (v == null || v === '') return ''
   const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
   if (!Number.isFinite(n)) return str(v)
   if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Gb`
   if (n >= 1e6) return `${(n / 1e6).toFixed(2)} Mb`
   if (n >= 1e3) return `${(n / 1e3).toFixed(1)} kb`
   return `${Math.round(n).toLocaleString()} bp`
}

export type AssemblyStatRow = { label: string; value: string }

/** Key rows from `metadata.assembly_stats` (INSDC-style payload). */
export function assemblyStatsRowsFromDoc(assemblyDoc: Record<string, unknown>): AssemblyStatRow[] {
   const meta = assemblyDoc.metadata
   if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return []
   const m = meta as Record<string, unknown>
   const stats = m.assembly_stats
   if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return []
   const s = stats as Record<string, unknown>

   const rows: AssemblyStatRow[] = []

   const pushNum = (key: string, label: string, formatter: (v: unknown) => string = fmtInt) => {
      if (s[key] == null || s[key] === '') return
      const val = formatter(s[key])
      if (val) rows.push({ label, value: val })
   }

   pushNum('total_sequence_length', 'Total sequence length', fmtBpLike)
   pushNum('total_ungapped_length', 'Ungapped length', fmtBpLike)
   pushNum('gc_percent', 'GC %', (v) => {
      const n = typeof v === 'number' ? v : Number(v)
      if (!Number.isFinite(n)) return str(v)
      return `${n}%`
   })
   pushNum('atgc_count', 'ATGC count', fmtBpLike)
   pushNum('gc_count', 'GC count', fmtBpLike)
   pushNum('genome_coverage', 'Genome coverage', (v) => `${str(v)}×`)
   pushNum('contig_n50', 'Contig N50', fmtBpLike)
   pushNum('scaffold_n50', 'Scaffold N50', fmtBpLike)
   pushNum('contig_l50', 'Contig L50')
   pushNum('scaffold_l50', 'Scaffold L50')
   pushNum('number_of_contigs', 'Contigs')
   pushNum('number_of_scaffolds', 'Scaffolds')
   pushNum('number_of_component_sequences', 'Component sequences')
   pushNum('total_number_of_chromosomes', 'Chromosomes (count)')
   pushNum('number_of_organelles', 'Organelles')

   return rows
}

export type AssemblyExternalLink = { label: string; href: string }

export function assemblyExternalLinks(
   accession: string,
   assemblyDoc: Record<string, unknown>,
): AssemblyExternalLink[] {
   const out: AssemblyExternalLink[] = []
   if (!accession) return out

   out.push({
      label: 'NCBI Assembly',
      href: `https://www.ncbi.nlm.nih.gov/assembly/${encodeURIComponent(accession)}`,
   })

   const meta = assemblyDoc.metadata
   if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
      const m = meta as Record<string, unknown>
      const info = (m.assembly_info as Record<string, unknown> | undefined) ?? {}

      const blast = str(info.blast_url)
      if (blast) out.push({ label: 'NCBI BLAST', href: blast })

      const bioproject = str(info.bioproject_accession)
      if (bioproject) {
         out.push({
            label: `BioProject ${bioproject}`,
            href: `https://www.ncbi.nlm.nih.gov/bioproject/${encodeURIComponent(bioproject)}`,
         })
      }

      const paired = info.paired_assembly
      if (paired && typeof paired === 'object' && !Array.isArray(paired)) {
         const p = paired as Record<string, unknown>
         const refAcc = str(p.accession)
         if (refAcc && refAcc !== accession) {
            out.push({
               label: `Paired assembly ${refAcc}`,
               href: `https://www.ncbi.nlm.nih.gov/assembly/${encodeURIComponent(refAcc)}`,
            })
         }
      }

      const pairedAcc = str(m.paired_accession)
      if (pairedAcc && pairedAcc !== accession && !out.some((l) => l.href.includes(pairedAcc))) {
         out.push({
            label: `Paired ${pairedAcc}`,
            href: `https://www.ncbi.nlm.nih.gov/assembly/${encodeURIComponent(pairedAcc)}`,
         })
      }

      const biosample = info.biosample
      if (biosample && typeof biosample === 'object' && !Array.isArray(biosample)) {
         const bs = str((biosample as Record<string, unknown>).accession)
         if (bs) {
            out.push({
               label: `BioSample ${bs}`,
               href: `https://www.ncbi.nlm.nih.gov/biosample/${encodeURIComponent(bs)}`,
            })
         }
      }
   }

   const sampleAcc = str(assemblyDoc.sample_accession)
   if (sampleAcc && !out.some((l) => l.href.includes(sampleAcc))) {
      out.push({
         label: `BioSample ${sampleAcc}`,
         href: `https://www.ncbi.nlm.nih.gov/biosample/${encodeURIComponent(sampleAcc)}`,
      })
   }

   return out
}

/** Short description line from assembly_info if present. */
export function assemblyDescriptionFromDoc(assemblyDoc: Record<string, unknown>): string {
   const meta = assemblyDoc.metadata
   if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return ''
   const info = (meta as Record<string, unknown>).assembly_info as Record<string, unknown> | undefined
   if (!info) return ''
   return str(info.description) || str(info.assembly_method)
}
