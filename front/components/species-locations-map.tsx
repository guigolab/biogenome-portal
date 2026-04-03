'use client'

import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { usePortalConfig } from '@/contexts/portal-context'
import { getPortalAppearance } from '@/lib/portal'

export type SpeciesMapPoint = { lat: number; lng: number }

const CARTO_ATTRIBUTION =
   '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const CARTO_TILE_OPTIONS = {
   attribution: CARTO_ATTRIBUTION,
   subdomains: 'abcd' as const,
   maxZoom: 20,
}

const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const MARKER = {
   radius: 7,
   color: '#0ea5e9',
   fillColor: '#38bdf8',
   fillOpacity: 0.55,
   weight: 1,
} as const

type SpeciesLocationsMapProps = {
   points: SpeciesMapPoint[]
   className?: string
}

export function SpeciesLocationsMap({ points, className }: SpeciesLocationsMapProps) {
   const mapRef = useRef<HTMLDivElement>(null)
   const mapInstanceRef = useRef<L.Map | null>(null)
   const layerRef = useRef<L.FeatureGroup | null>(null)
   const tileLayerRef = useRef<L.TileLayer | null>(null)
   const lastFitKeyRef = useRef<string>('')
   const [mounted, setMounted] = useState(false)
   const { resolvedTheme } = useTheme()
   const { raw: portalRaw } = usePortalConfig()

   const basemapDark = useMemo(() => {
      if (portalRaw) {
         const a = getPortalAppearance(portalRaw)
         if (a === 'light') return false
         if (a === 'dark') return true
      }
      return resolvedTheme === 'dark'
   }, [portalRaw, resolvedTheme])

   useEffect(() => {
      setMounted(true)
   }, [])

   useEffect(() => {
      if (!mounted || !mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
         center: [20, 0],
         zoom: 2,
         minZoom: 2,
         maxZoom: 16,
         zoomControl: true,
      })
      const fg = L.featureGroup().addTo(map)
      layerRef.current = fg
      mapInstanceRef.current = map

      return () => {
         tileLayerRef.current = null
         map.remove()
         mapInstanceRef.current = null
         layerRef.current = null
      }
   }, [mounted])

   useEffect(() => {
      const map = mapInstanceRef.current
      if (!map) return
      const url = basemapDark ? CARTO_DARK : CARTO_LIGHT
      const prev = tileLayerRef.current
      if (prev && map.hasLayer(prev)) map.removeLayer(prev)
      const layer = L.tileLayer(url, CARTO_TILE_OPTIONS)
      layer.addTo(map)
      tileLayerRef.current = layer
   }, [mounted, basemapDark])

   useEffect(() => {
      const map = mapInstanceRef.current
      const fg = layerRef.current
      if (!map || !fg) return

      fg.clearLayers()
      const bounds: L.LatLng[] = []
      for (const p of points) {
         if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
         bounds.push(L.latLng(p.lat, p.lng))
         L.circleMarker([p.lat, p.lng], { ...MARKER }).addTo(fg)
      }

      if (bounds.length > 0) {
         const key = bounds.map((ll) => `${ll.lat},${ll.lng}`).join('|')
         if (key !== lastFitKeyRef.current) {
            lastFitKeyRef.current = key
            map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 12 })
         }
      }
   }, [points])

   if (!mounted) {
      return (
         <div
            className={
               className ??
               'flex h-[280px] w-full items-center justify-center rounded-lg border border-border bg-card'
            }
         >
            <span className="text-sm text-muted-foreground">Loading map…</span>
         </div>
      )
   }

   return (
      <div
         ref={mapRef}
         className={className ?? 'h-[280px] w-full rounded-lg border border-border overflow-hidden z-0'}
      />
   )
}
