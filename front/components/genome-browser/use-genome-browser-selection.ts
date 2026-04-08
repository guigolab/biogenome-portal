'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { GenomeAnnotationRow } from '@/lib/api/assemblies'
import { fetchGenomeBrowserContext } from '@/lib/api/jbrowse'
import type { ChromosomeRow } from '@/lib/genome-browser/buildDefaultSession'
import type { JbrowseSelectedChromosome } from '@/components/genome-browser/jbrowse-linear-view'

function filterAnnotationsByQuery(
   all: GenomeAnnotationRow[],
   annotationQuery: string | undefined,
): { selected: GenomeAnnotationRow[]; resolvedName?: string } {
   if (!annotationQuery?.trim()) {
      return { selected: [...all] }
   }
   const q = annotationQuery.trim().toLowerCase()
   const matched = all.find((a) => a.name.toLowerCase() === q)
   if (matched) {
      return { selected: [matched], resolvedName: matched.name }
   }
   return { selected: [...all] }
}

/** Map server browser chromosome row to JBrowse nav (ref + length). */
export function chromosomeRowToJbrowseSelection(chr: ChromosomeRow): JbrowseSelectedChromosome {
   return {
      chr_name: chr.jbrowse_ref_name,
      length: chr.length_bp > 0 ? chr.length_bp : 1_000_000,
   }
}

type UseGenomeBrowserSelectionArgs = {
   assemblyParam: string | undefined
   annotationParam: string | undefined
   taxid: string | undefined
   replaceQuery: (next: Record<string, string | undefined>) => void
}

export function useGenomeBrowserSelection({
   assemblyParam,
   annotationParam,
   taxid,
   replaceQuery,
}: UseGenomeBrowserSelectionArgs) {
   const [selectedAssemblyDoc, setSelectedAssemblyDoc] = useState<Record<string, unknown> | null>(null)
   const [chromosomes, setChromosomes] = useState<ChromosomeRow[]>([])
   const [annotations, setAnnotations] = useState<GenomeAnnotationRow[]>([])
   const [selectionLoading, setSelectionLoading] = useState(false)
   const [selectionError, setSelectionError] = useState<string | null>(null)
   const [selectedChrIds, setSelectedChrIds] = useState<string[]>([])
   const appliedKeyRef = useRef('')

   const loadSelection = useCallback(
      async (accession: string, annotationName?: string) => {
         setSelectionLoading(true)
         setSelectionError(null)
         try {
            const ctx = await fetchGenomeBrowserContext(accession)
            const { selected, resolvedName } = filterAnnotationsByQuery(ctx.annotations, annotationName)
            setSelectedAssemblyDoc(ctx.assembly)
            setChromosomes(ctx.chromosomes)
            setAnnotations(selected)
            setSelectedChrIds([])

            const next: Record<string, string | undefined> = { assembly: accession }
            if (annotationName && resolvedName) next.annotation = resolvedName
            else next.annotation = undefined
            if (taxid) next.taxid = taxid

            appliedKeyRef.current = `${next.assembly ?? ''}|${next.annotation ?? ''}|${taxid ?? ''}`
            replaceQuery(next)
         } catch (e) {
            setSelectionError(e instanceof Error ? e.message : 'Failed to load assembly')
            setSelectedAssemblyDoc(null)
            setChromosomes([])
            setAnnotations([])
         } finally {
            setSelectionLoading(false)
         }
      },
      [replaceQuery, taxid],
   )

   useEffect(() => {
      if (!assemblyParam) {
         setSelectedAssemblyDoc(null)
         setChromosomes([])
         setAnnotations([])
         setSelectedChrIds([])
         appliedKeyRef.current = ''
         return
      }
      const key = `${assemblyParam}|${annotationParam ?? ''}|${taxid ?? ''}`
      if (key === appliedKeyRef.current) return
      void loadSelection(assemblyParam, annotationParam)
   }, [assemblyParam, annotationParam, taxid, loadSelection])

   return {
      selectedAssemblyDoc,
      chromosomes,
      annotations,
      selectionLoading,
      selectionError,
      selectedChrIds,
      setSelectedChrIds,
      loadSelection,
   }
}
