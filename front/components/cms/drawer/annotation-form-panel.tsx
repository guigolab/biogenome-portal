'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import {
   cmsCreateAnnotation,
   cmsCreateAnnotationFormData,
   cmsGetItem,
   cmsGetItems,
   cmsUpdateAnnotation,
} from '@/lib/cms/services/auth'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

type MetaRow = { key: string; value: string }

export function AnnotationFormPanel({ editName }: { editName?: string | null }) {
   const close = useCmsDrawerStore((s) => s.close)

   const [loading, setLoading] = useState(!!editName)
   const [submitting, setSubmitting] = useState(false)
   const [uploadMode, setUploadMode] = useState<'files' | 'links'>('files')

   const [name, setName] = useState('')
   const [assemblyAccession, setAssemblyAccession] = useState('')
   const [assemblyQuery, setAssemblyQuery] = useState('')
   const [assemblyHits, setAssemblyHits] = useState<Record<string, unknown>[]>([])

   const [gffUrl, setGffUrl] = useState('')
   const [tbiUrl, setTbiUrl] = useState('')
   const [gffFile, setGffFile] = useState<File | null>(null)
   const [tbiFile, setTbiFile] = useState<File | null>(null)

   const [metadataList, setMetadataList] = useState<MetaRow[]>([])
   const [isExternal, setIsExternal] = useState(false)

   const fetchAssemblies = useCallback(async (q: string) => {
      try {
         const body = await cmsGetItems('assemblies', { filter: q, limit: 12 })
         setAssemblyHits(body.data ?? [])
      } catch {
         setAssemblyHits([])
      }
   }, [])

   useEffect(() => {
      const t = setTimeout(() => {
         if (assemblyQuery.trim().length >= 2) void fetchAssemblies(assemblyQuery.trim())
         else setAssemblyHits([])
      }, 300)
      return () => clearTimeout(t)
   }, [assemblyQuery, fetchAssemblies])

   useEffect(() => {
      if (!editName) return
      let cancelled = false
      ;(async () => {
         setLoading(true)
         try {
            const data = await cmsGetItem('annotations', editName)
            if (cancelled) return
            setName(String(data.name ?? editName))
            setAssemblyAccession(String(data.assembly_accession ?? ''))
            setGffUrl(String(data.gff_gz_location ?? ''))
            setTbiUrl(String(data.tab_index_location ?? ''))
            setIsExternal(Boolean(data.external))
            setUploadMode('links')
            const md = data.metadata
            if (md && typeof md === 'object' && !Array.isArray(md)) {
               setMetadataList(Object.entries(md as Record<string, unknown>).map(([k, v]) => ({ key: k, value: String(v) })))
            }
         } catch (e) {
            if (!cancelled) {
               toast.error(extractApiMessage(e, 'Failed to load annotation'))
               close()
            }
         } finally {
            if (!cancelled) setLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [editName, close])

   function duplicateKey(key: string, idx: number) {
      return metadataList.some((m, i) => i !== idx && m.key === key && key.length > 0)
   }

   async function handleSubmit() {
      if (!assemblyAccession.trim()) {
         toast.warning('Select or enter an assembly accession.')
         return
      }
      if (uploadMode === 'links') {
         if (!gffUrl.trim() || !tbiUrl.trim()) {
            toast.warning('Provide GFF URL and tabix index URL.')
            return
         }
      } else if (!editName) {
         if (!gffFile || !tbiFile) {
            toast.warning('Upload .gz GFF and .tbi index.')
            return
         }
      }

      if (!editName && !name.trim()) {
         toast.warning('Annotation name is required.')
         return
      }

      const metadata = Object.fromEntries(metadataList.filter((m) => m.key && m.value).map((m) => [m.key, m.value]))

      setSubmitting(true)
      try {
         if (editName) {
            const body: Record<string, unknown> = {
               assembly_accession: assemblyAccession.trim(),
               gff_gz_location: gffUrl.trim() || undefined,
               tab_index_location: tbiUrl.trim() || undefined,
            }
            for (const [k, v] of Object.entries(metadata)) {
               body[`metadata.${k}`] = v
            }
            await cmsUpdateAnnotation(editName, body)
            toast.success(`Annotation ${editName} updated.`)
         } else if (uploadMode === 'links') {
            await cmsCreateAnnotation({
               name: name.trim(),
               assembly_accession: assemblyAccession.trim(),
               gff_gz_location: gffUrl.trim(),
               tab_index_location: tbiUrl.trim(),
               ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`metadata.${k}`, v])),
            })
            toast.success('Annotation created.')
         } else {
            const fd = new FormData()
            fd.append('name', name.trim())
            fd.append('assembly_accession', assemblyAccession.trim())
            fd.append('gzipAnnotation', gffFile!)
            fd.append('tabixAnnotation', tbiFile!)
            for (const [k, v] of Object.entries(metadata)) {
               fd.append(`metadata.${k}`, v)
            }
            await cmsCreateAnnotationFormData(fd)
            toast.success('Annotation created.')
         }
         close()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Save failed'))
      } finally {
         setSubmitting(false)
      }
   }

   if (loading) {
      return (
         <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      )
   }

   return (
      <div className="space-y-5">
         {!editName ? (
            <div className="space-y-3">
               <div>
                  <Label htmlFor="ann-name">Annotation name</Label>
                  <Input id="ann-name" value={name} onChange={(e) => setName(e.target.value)} className="font-mono" />
               </div>
               <div>
                  <Label>Assembly</Label>
                  <Input
                     placeholder="Search accession or name…"
                     value={assemblyQuery}
                     onChange={(e) => setAssemblyQuery(e.target.value)}
                  />
                  {assemblyHits.length > 0 ? (
                     <ul className="mt-1 max-h-32 overflow-auto rounded-md border border-border text-sm">
                        {assemblyHits.map((a) => (
                           <li key={String(a.accession)}>
                              <button
                                 type="button"
                                 className="flex w-full flex-col px-2 py-1.5 text-left hover:bg-muted"
                                 onClick={() => {
                                    setAssemblyAccession(String(a.accession ?? ''))
                                    setAssemblyQuery('')
                                    setAssemblyHits([])
                                 }}
                              >
                                 <span className="font-mono text-xs">{String(a.accession)}</span>
                                 <span className="truncate text-xs text-muted-foreground">{String(a.assembly_name ?? a.scientific_name ?? '')}</span>
                              </button>
                           </li>
                        ))}
                     </ul>
                  ) : null}
                  <Input
                     className="mt-2 font-mono text-sm"
                     placeholder="Selected accession"
                     value={assemblyAccession}
                     onChange={(e) => setAssemblyAccession(e.target.value)}
                  />
               </div>
            </div>
         ) : (
            <p className="text-sm text-muted-foreground">
               Assembly <span className="font-mono font-medium text-foreground">{assemblyAccession}</span>
            </p>
         )}

         <div>
            <Label className="mb-2 block">GFF delivery</Label>
            <ToggleGroup
               type="single"
               value={uploadMode}
               onValueChange={(v) => {
                  if (v === 'files' || v === 'links') setUploadMode(v)
               }}
               className="justify-start"
            >
               <ToggleGroupItem value="files" className="text-xs" disabled={!!editName && !isExternal}>
                  Files
               </ToggleGroupItem>
               <ToggleGroupItem value="links" className="text-xs">
                  URLs
               </ToggleGroupItem>
            </ToggleGroup>
            {editName && !isExternal ? (
               <p className="mt-1 text-xs text-muted-foreground">File replace is not supported for existing annotations.</p>
            ) : null}
         </div>

         {uploadMode === 'links' ? (
            <div className="space-y-3">
               <div>
                  <Label htmlFor="gff-url">GFF3 .gz URL</Label>
                  <Input id="gff-url" value={gffUrl} onChange={(e) => setGffUrl(e.target.value)} placeholder="https://…" />
               </div>
               <div>
                  <Label htmlFor="tbi-url">Tabix .tbi URL</Label>
                  <Input id="tbi-url" value={tbiUrl} onChange={(e) => setTbiUrl(e.target.value)} placeholder="https://…" />
               </div>
            </div>
         ) : !editName ? (
            <div className="space-y-3">
               <div>
                  <Label htmlFor="gff-f">GFF3 .gz</Label>
                  <Input id="gff-f" type="file" accept=".gz" onChange={(e) => setGffFile(e.target.files?.[0] ?? null)} />
               </div>
               <div>
                  <Label htmlFor="tbi-f">Tabix .tbi</Label>
                  <Input id="tbi-f" type="file" accept=".tbi" onChange={(e) => setTbiFile(e.target.files?.[0] ?? null)} />
               </div>
            </div>
         ) : null}

         <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
               <Label>Metadata</Label>
               <Button type="button" variant="outline" size="sm" onClick={() => setMetadataList((m) => [...m, { key: '', value: '' }])}>
                  Add
               </Button>
            </div>
            {metadataList.length === 0 ? (
               <p className="text-xs text-muted-foreground">Optional key–value fields.</p>
            ) : (
               <ul className="space-y-2">
                  {metadataList.map((row, idx) => (
                     <li key={idx} className="flex flex-wrap items-end gap-2">
                        <div className="min-w-0 flex-1">
                           <Label className="text-xs">Key</Label>
                           <Input
                              value={row.key}
                              onChange={(e) =>
                                 setMetadataList((list) => list.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r)))
                              }
                              className={duplicateKey(row.key, idx) ? 'border-destructive' : ''}
                           />
                        </div>
                        <div className="min-w-0 flex-1">
                           <Label className="text-xs">Value</Label>
                           <Input
                              value={row.value}
                              onChange={(e) =>
                                 setMetadataList((list) => list.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)))
                              }
                           />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setMetadataList((list) => list.filter((_, i) => i !== idx))}>
                           <Trash2 className="h-4 w-4" />
                        </Button>
                     </li>
                  ))}
               </ul>
            )}
         </div>

         <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={close}>
               Cancel
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
               {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editName ? 'Update' : 'Create'}
            </Button>
         </div>
      </div>
   )
}
