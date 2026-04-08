'use client'

import { useEffect, useId, useMemo, useState } from 'react'

import { SpeciesLocationsMap } from '@/components/species-locations-map'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const LAT_RE = /lat(itude)?/i
const LON_RE = /lon(gitude)?|lng/i

type BiosampleCoordinatesPreviewProps = {
   availableFieldNames: string[]
   characterics: Record<string, string | string[]>
}

export function BiosampleCoordinatesPreview({ availableFieldNames, characterics }: BiosampleCoordinatesPreviewProps) {
   const uid = useId()
   const selectableFields = useMemo(
      () => (availableFieldNames.length ? availableFieldNames : Object.keys(characterics)),
      [availableFieldNames, characterics],
   )

   const autoLat = useMemo(() => selectableFields.find((f) => LAT_RE.test(f)) ?? '', [selectableFields])
   const autoLon = useMemo(() => selectableFields.find((f) => LON_RE.test(f)) ?? '', [selectableFields])

   const [latitudeField, setLatitudeField] = useState('')
   const [longitudeField, setLongitudeField] = useState('')
   const [manuallyOverridden, setManuallyOverridden] = useState(false)
   const [mapRemountKey, setMapRemountKey] = useState(0)

   useEffect(() => {
      if (!selectableFields.length) return
      if (manuallyOverridden) return
      setLatitudeField((prev) => (prev ? prev : autoLat))
      setLongitudeField((prev) => (prev ? prev : autoLon))
   }, [selectableFields, autoLat, autoLon, manuallyOverridden])

   useEffect(() => {
      setMapRemountKey((k) => k + 1)
   }, [latitudeField, longitudeField])

   const parseCoord = (fieldName: string): number | null => {
      if (!fieldName) return null
      const raw = characterics[fieldName]
      const s = raw === undefined ? '' : Array.isArray(raw) ? raw.join(' ') : String(raw)
      const n = parseFloat(s.trim())
      return Number.isFinite(n) ? n : null
   }

   const currentLat = parseCoord(latitudeField)
   const currentLon = parseCoord(longitudeField)
   const hasFields = Boolean(latitudeField || longitudeField)
   const isAutoDetected =
      !manuallyOverridden &&
      Boolean(latitudeField || longitudeField) &&
      latitudeField === autoLat &&
      longitudeField === autoLon

   const points =
      currentLat !== null && currentLon !== null ? [{ lat: currentLat, lng: currentLon }] : []

   const badgeClass = isAutoDetected
      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
      : hasFields
        ? 'bg-blue-500/10 text-blue-800 dark:text-blue-200'
        : 'bg-muted text-muted-foreground'

   return (
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
         <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <span className="text-xs font-semibold text-foreground">Location preview</span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', badgeClass)}>
               {isAutoDetected ? 'Auto' : hasFields ? 'Manual' : 'Idle'}
            </span>
         </div>

         <div className="relative h-[200px] w-full bg-muted/30">
            <SpeciesLocationsMap key={mapRemountKey} points={points} className="h-[200px] rounded-none border-0" />
            {points.length === 0 ? (
               <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col items-center justify-center gap-2 bg-muted/80 px-4 text-center">
                  <p className="text-xs text-muted-foreground">
                     {hasFields
                        ? 'Enter values in the form to preview location'
                        : 'Select lat/lon fields below'}
                  </p>
               </div>
            ) : null}
         </div>

         <div
            className={cn(
               'flex min-h-9 items-center justify-center gap-2 border-t border-border bg-muted/30 px-3 py-2 text-xs',
               points.length > 0 && 'text-foreground',
            )}
         >
            {currentLat !== null && currentLon !== null ? (
               <>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Lat</span>
                  <span className="font-mono font-semibold tabular-nums">{currentLat.toFixed(5)}</span>
                  <span className="text-muted-foreground" aria-hidden>
                     /
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Lon</span>
                  <span className="font-mono font-semibold tabular-nums">{currentLon.toFixed(5)}</span>
               </>
            ) : (
               <span className="italic text-muted-foreground">No valid coordinates yet</span>
            )}
         </div>

         <div className="flex flex-col gap-2 border-t border-border p-3">
            <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2">
               <Label htmlFor={`${uid}-lat`} className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Lat
               </Label>
               <Select
                  value={latitudeField || '__none__'}
                  onValueChange={(v) => {
                     setManuallyOverridden(true)
                     setLatitudeField(v === '__none__' ? '' : v)
                  }}
               >
                  <SelectTrigger id={`${uid}-lat`} className="h-8 text-xs">
                     <SelectValue placeholder="— none —" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="__none__">— none —</SelectItem>
                     {selectableFields.map((f) => (
                        <SelectItem key={f} value={f}>
                           {f}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>
            <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2">
               <Label htmlFor={`${uid}-lon`} className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Lon
               </Label>
               <Select
                  value={longitudeField || '__none__'}
                  onValueChange={(v) => {
                     setManuallyOverridden(true)
                     setLongitudeField(v === '__none__' ? '' : v)
                  }}
               >
                  <SelectTrigger id={`${uid}-lon`} className="h-8 text-xs">
                     <SelectValue placeholder="— none —" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="__none__">— none —</SelectItem>
                     {selectableFields.map((f) => (
                        <SelectItem key={f} value={f}>
                           {f}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>
            {!isAutoDetected && (autoLat || autoLon) ? (
               <button
                  type="button"
                  className="self-start text-[11px] text-primary underline underline-offset-2"
                  onClick={() => {
                     setManuallyOverridden(false)
                     setLatitudeField(autoLat)
                     setLongitudeField(autoLon)
                  }}
               >
                  Reset to auto-detected
               </button>
            ) : null}
         </div>
      </div>
   )
}
