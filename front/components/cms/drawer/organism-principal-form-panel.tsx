'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import {
   cmsCreateOrganismPrincipal,
   cmsGetOrganismPrincipal,
   cmsUpdateOrganismPrincipal,
} from '@/lib/cms/services/organism-principals'
import {
   cmsSearchRorOrganizations,
   cmsValidateRorOrganization,
   type RorOrganization,
} from '@/lib/cms/services/ror'
import { cn } from '@/lib/utils'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

function TagListEditor({
   label,
   helpText,
   values,
   onChange,
   placeholder,
}: {
   label: string
   helpText?: string
   values: string[]
   onChange: (values: string[]) => void
   placeholder?: string
}) {
   const [draft, setDraft] = useState('')

   function addValue() {
      const trimmed = draft.trim()
      if (!trimmed) return
      if (!values.includes(trimmed)) onChange([...values, trimmed])
      setDraft('')
   }

   function removeValue(value: string) {
      onChange(values.filter((v) => v !== value))
   }

   return (
      <div>
         <Label>{label}</Label>
         {helpText ? <p className="mb-1.5 text-xs text-muted-foreground">{helpText}</p> : null}
         <div className="flex gap-2">
            <Input
               value={draft}
               placeholder={placeholder}
               onChange={(e) => setDraft(e.target.value)}
               onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                     e.preventDefault()
                     addValue()
                  }
               }}
            />
            <Button type="button" size="icon" variant="outline" onClick={addValue}>
               <Plus className="h-4 w-4" />
            </Button>
         </div>
         {values.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
               {values.map((value) => (
                  <Badge key={value} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1.5">
                     {value}
                     <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                        onClick={() => removeValue(value)}
                        aria-label={`Remove ${value}`}
                     >
                        <X className="h-3 w-3" />
                     </button>
                  </Badge>
               ))}
            </div>
         ) : null}
      </div>
   )
}

const ROR_SEARCH_DEBOUNCE_MS = 300
const ROR_SEARCH_MIN_CHARS = 2

/**
 * Affiliations editor backed by ROR: typeahead suggestions plus Enter/Add
 * validation so free-typed names must resolve to a real registry record.
 */
function InstituteTagEditor({
   values,
   onChange,
}: {
   values: string[]
   onChange: (values: string[]) => void
}) {
   const listId = useId()
   const rootRef = useRef<HTMLDivElement | null>(null)
   const [draft, setDraft] = useState('')
   const [debouncedQuery, setDebouncedQuery] = useState('')
   const [suggestions, setSuggestions] = useState<RorOrganization[]>([])
   const [searching, setSearching] = useState(false)
   const [open, setOpen] = useState(false)
   const [validating, setValidating] = useState(false)
   const [error, setError] = useState<string | null>(null)

   useEffect(() => {
      const t = setTimeout(() => setDebouncedQuery(draft.trim()), ROR_SEARCH_DEBOUNCE_MS)
      return () => clearTimeout(t)
   }, [draft])

   useEffect(() => {
      if (debouncedQuery.length < ROR_SEARCH_MIN_CHARS) {
         setSuggestions([])
         setSearching(false)
         return
      }
      let cancelled = false
      ;(async () => {
         setSearching(true)
         try {
            const res = await cmsSearchRorOrganizations(debouncedQuery, 8)
            if (cancelled) return
            setSuggestions(Array.isArray(res.items) ? res.items : [])
            setOpen(true)
         } catch {
            if (!cancelled) {
               setSuggestions([])
            }
         } finally {
            if (!cancelled) setSearching(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [debouncedQuery])

   useEffect(() => {
      function onPointerDown(e: MouseEvent) {
         if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', onPointerDown)
      return () => document.removeEventListener('mousedown', onPointerDown)
   }, [])

   function addName(name: string) {
      const trimmed = name.trim()
      if (!trimmed) return
      if (!values.includes(trimmed)) onChange([...values, trimmed])
      setDraft('')
      setDebouncedQuery('')
      setSuggestions([])
      setOpen(false)
      setError(null)
   }

   function removeValue(value: string) {
      onChange(values.filter((v) => v !== value))
   }

   async function validateAndAdd() {
      const trimmed = draft.trim()
      if (!trimmed || validating) return
      setValidating(true)
      setError(null)
      try {
         const res = await cmsValidateRorOrganization(trimmed)
         if (res.valid && res.data && 'name' in res.data && res.data.name) {
            addName(String(res.data.name))
         } else {
            setError(res.error || `'${trimmed}' was not found in ROR.`)
            setOpen(false)
         }
      } catch (e) {
         setError(extractApiMessage(e, 'Institute validation failed.'))
         setOpen(false)
      } finally {
         setValidating(false)
      }
   }

   const showDropdown =
      open && (searching || suggestions.length > 0) && draft.trim().length >= ROR_SEARCH_MIN_CHARS

   return (
      <div ref={rootRef}>
         <Label htmlFor={`${listId}-input`}>Affiliations / institutes</Label>
         <p className="mb-1.5 text-xs text-muted-foreground">
            Search ROR and select an institute, or type a name / ROR ID and press Enter to validate.
         </p>
         <div className="relative flex gap-2">
            <div className="relative min-w-0 flex-1">
               <Input
                  id={`${listId}-input`}
                  value={draft}
                  placeholder="Search institutes (e.g. Institut de Biologia Evolutiva)…"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls={listId}
                  aria-expanded={showDropdown}
                  disabled={validating}
                  onChange={(e) => {
                     setDraft(e.target.value)
                     setError(null)
                     setOpen(true)
                  }}
                  onFocus={() => {
                     if (suggestions.length > 0) setOpen(true)
                  }}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                        e.preventDefault()
                        void validateAndAdd()
                     } else if (e.key === 'Escape') {
                        setOpen(false)
                     }
                  }}
               />
               {showDropdown ? (
                  <ul
                     id={listId}
                     role="listbox"
                     className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
                  >
                     {searching && suggestions.length === 0 ? (
                        <li className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                           <Loader2 className="h-3.5 w-3.5 animate-spin" />
                           Searching ROR…
                        </li>
                     ) : null}
                     {suggestions.map((org) => (
                        <li key={org.ror_id || org.name}>
                           <button
                              type="button"
                              role="option"
                              className={cn(
                                 'flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm',
                                 'hover:bg-accent hover:text-accent-foreground',
                              )}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => addName(org.name)}
                           >
                              <span className="font-medium">{org.name}</span>
                              <span className="text-xs text-muted-foreground">
                                 {[org.country, org.ror_id].filter(Boolean).join(' · ')}
                              </span>
                           </button>
                        </li>
                     ))}
                  </ul>
               ) : null}
            </div>
            <Button
               type="button"
               size="icon"
               variant="outline"
               disabled={validating || !draft.trim()}
               onClick={() => void validateAndAdd()}
               title="Validate and add"
            >
               {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
         </div>
         {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
         {values.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
               {values.map((value) => (
                  <Badge key={value} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1.5">
                     {value}
                     <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                        onClick={() => removeValue(value)}
                        aria-label={`Remove ${value}`}
                     >
                        <X className="h-3 w-3" />
                     </button>
                  </Badge>
               ))}
            </div>
         ) : null}
      </div>
   )
}

export function OrganismPrincipalFormPanel({ editSlug }: { editSlug?: string | null }) {
   const close = useCmsDrawerStore((s) => s.close)
   const notifyPrincipalSaved = useCmsDrawerStore((s) => s.notifyPrincipalSaved)

   const [loading, setLoading] = useState(!!editSlug)
   const [submitting, setSubmitting] = useState(false)

   const [name, setName] = useState('')
   const [email, setEmail] = useState('')
   const [affiliations, setAffiliations] = useState<string[]>([])
   const [programs, setPrograms] = useState<string[]>([])

   useEffect(() => {
      if (!editSlug) return
      let cancelled = false
      ;(async () => {
         setLoading(true)
         try {
            const p = await cmsGetOrganismPrincipal(editSlug)
            if (cancelled) return
            setName(String(p.name ?? ''))
            setEmail(String(p.email ?? ''))
            setAffiliations(Array.isArray(p.affiliations) ? p.affiliations.map(String) : [])
            setPrograms(Array.isArray(p.programs) ? p.programs.map(String) : [])
         } catch (e) {
            if (!cancelled) {
               toast.error(extractApiMessage(e, 'Failed to load principal'))
               close()
            }
         } finally {
            if (!cancelled) setLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [editSlug, close])

   async function handleSubmit() {
      if (!name.trim()) {
         toast.warning('Name is required.')
         return
      }
      const payload: Record<string, unknown> = {
         name: name.trim(),
         affiliations,
         programs,
         email: email.trim() || null,
      }
      setSubmitting(true)
      try {
         if (editSlug) {
            await cmsUpdateOrganismPrincipal(editSlug, payload)
            toast.success(`${name.trim()} updated.`)
         } else {
            await cmsCreateOrganismPrincipal(payload)
            toast.success(`${name.trim()} created.`)
         }
         notifyPrincipalSaved()
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
      <form
         className="space-y-6"
         onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
         }}
      >
         <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
               <Label htmlFor="cms-principal-name">Name</Label>
               <Input
                  id="cms-principal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
               />
               {!editSlug ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                     A URL-safe identifier is generated automatically from this name.
                  </p>
               ) : null}
            </div>

            <div className="sm:col-span-2">
               <Label htmlFor="cms-principal-email">Email (optional)</Label>
               <Input
                  id="cms-principal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
               />
            </div>

            <div className="sm:col-span-2">
               <InstituteTagEditor values={affiliations} onChange={setAffiliations} />
            </div>

            <div className="sm:col-span-2">
               <TagListEditor
                  label="Programs / projects"
                  helpText="Funding programs or projects this principal leads (optional)."
                  values={programs}
                  onChange={setPrograms}
                  placeholder="Add a program and press Enter…"
               />
            </div>
         </div>

         <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={close}>
               Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
               {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editSlug ? 'Save' : 'Create principal'}
            </Button>
         </div>
      </form>
   )
}
