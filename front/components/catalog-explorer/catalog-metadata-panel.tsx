'use client'

import type { InsdcCatalogMetadataModel } from '@/lib/catalog-metadata'
import { mapCatalogMetadata, stringifyMetadataValue } from '@/lib/catalog-metadata'
import { cn } from '@/lib/utils'

/** `paired_accession` → `Paired Accession`, `wgs_info` → `Wgs Info`. */
function humanizeSectionTitle(id: string): string {
   return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function EntryRow({
   e,
   hideLabel = false,
}: {
   e: { label: string; displayValue: string; valueKind: string }
   hideLabel?: boolean
}) {
   const isMultiline =
      e.valueKind === 'object' || e.valueKind === 'array' || e.displayValue.includes('\n')
   return (
      <div className="border-b border-border/60 py-2 last:border-b-0">
         {!hideLabel ? (
            <div className="text-[11px] font-medium text-muted-foreground">{e.label}</div>
         ) : null}
         <div
            className={cn(
               'break-words text-xs',
               !hideLabel && 'mt-0.5',
               isMultiline && 'whitespace-pre-wrap rounded-md bg-muted/40 p-2 font-mono leading-relaxed',
            )}
         >
            {e.displayValue || '—'}
         </div>
      </div>
   )
}

export type CatalogMetadataPanelProps = {
   model: InsdcCatalogMetadataModel
   metadata: unknown
   className?: string
   /** Omit top-level metadata sections by id (e.g. assembly raw blobs shown elsewhere). */
   omitSectionIds?: ReadonlySet<string> | readonly string[]
}

/**
 * Renders catalog `metadata` using shared layout rules (assembly / read / annotation / biosample).
 */
export function CatalogMetadataPanel({
   model,
   metadata,
   className,
   omitSectionIds,
}: CatalogMetadataPanelProps) {
   if (metadata === null || metadata === undefined) return null

   const omit =
      omitSectionIds == null
         ? null
         : omitSectionIds instanceof Set
           ? omitSectionIds
           : new Set(omitSectionIds)

   const mapped = mapCatalogMetadata(model, metadata)

   if (mapped.model === 'biosamples') {
      const { partition } = mapped
      if (
         partition.universal.length === 0 &&
         partition.infrastructure.length === 0 &&
         partition.sampleAttributes.length === 0
      ) {
         return null
      }
      return (
         <div className={cn('space-y-4', className)}>
            {partition.checklistId ? (
               <div className="text-xs text-muted-foreground">
                  ENA checklist:{' '}
                  <span className="font-mono text-foreground">{partition.checklistId}</span>
               </div>
            ) : null}
            {partition.universal.length > 0 ? (
               <section>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                     Universal
                  </h4>
                  <div className="rounded-md border border-border px-2">
                     {partition.universal.map((e) => (
                        <EntryRow key={e.key} e={e} />
                     ))}
                  </div>
               </section>
            ) : null}
            {partition.infrastructure.length > 0 ? (
               <section>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                     INSDC / ENA
                  </h4>
                  <div className="rounded-md border border-border px-2">
                     {partition.infrastructure.map((e) => (
                        <EntryRow key={e.key} e={e} />
                     ))}
                  </div>
               </section>
            ) : null}
            {partition.sampleAttributes.length > 0 ? (
               <section>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                     Sample attributes
                  </h4>
                  <div className="rounded-md border border-border px-2">
                     {partition.sampleAttributes.map((e) => (
                        <EntryRow key={e.key} e={e} />
                     ))}
                  </div>
               </section>
            ) : null}
         </div>
      )
   }

   let { sections } = mapped
   if (omit?.size) {
      sections = sections.filter((s) => !omit.has(s.id))
   }
   if (sections.length === 0) return null

   return (
      <div className={cn('space-y-4', className)}>
         {sections.map((sec) => (
            <section key={sec.id}>
               <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {humanizeSectionTitle(sec.title)}
               </h4>
               <div className="rounded-md border border-border px-2">
                  {sec.entries.map((e) => (
                     <EntryRow
                        key={e.key}
                        e={e}
                        hideLabel={sec.entries.length === 1 && e.label === sec.id}
                     />
                  ))}
               </div>
            </section>
         ))}
      </div>
   )
}

/** Compact one-line preview for toolbars (first scalar or truncated JSON). */
export function catalogMetadataPreview(metadata: unknown, maxLen = 120): string {
   const rec =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
         ? (metadata as Record<string, unknown>)
         : null
   if (!rec) return ''
   for (const k of ['assembly_name', 'experiment_title', 'title', 'run_accession', 'name']) {
      const v = rec[k]
      if (typeof v === 'string' && v.trim()) {
         const s = v.trim()
         return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s
      }
   }
   const raw = stringifyMetadataValue(metadata, 0)
   return raw.length > maxLen ? `${raw.slice(0, maxLen - 1)}…` : raw
}
