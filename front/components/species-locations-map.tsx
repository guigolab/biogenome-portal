'use client'

import { useTheme } from 'next-themes'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
   leafletMarkerPalettesFromRoot,
   type LeafletCircleMarkerStyle,
} from '@/lib/portal/brandColorsFromDocument'
import { CARTO_TILE_OPTIONS, cartoTileUrl } from '@/lib/portal/cartoBasemap'
import { useAppearanceStore } from '@/stores/appearance-store'
import { cn } from '@/lib/utils'

export type SpeciesMapPoint = { lat: number; lng: number }

function toFiniteNumber(v: unknown): number {
   if (typeof v === 'number' && Number.isFinite(v)) return v
   if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
   }
   return NaN
}

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
   const [mapReady, setMapReady] = useState(false)
   const { resolvedTheme } = useTheme()
   const appearance = useAppearanceStore((s) => s.appearance)
   const [markerStyle, setMarkerStyle] = useState<LeafletCircleMarkerStyle | null>(null)

   useLayoutEffect(() => {
      if (typeof document === 'undefined') return
      const { default: d } = leafletMarkerPalettesFromRoot(document.documentElement)
      setMarkerStyle({
         ...d,
         fillOpacity: 0.85,
         weight: 2,
      })
   }, [resolvedTheme, appearance])

   const basemapDark = useMemo(() => {
      if (appearance === 'light') return false
      if (appearance === 'dark') return true
      return resolvedTheme === 'dark'
   }, [appearance, resolvedTheme])

   useEffect(() => {
      setMounted(true)
   }, [])

   // Create map once: basemap first, then feature group (reliable pane stacking).
   useEffect(() => {
      if (!mounted || !mapRef.current || mapInstanceRef.current) return

      const el = mapRef.current
      const map = L.map(el, {
         center: [20, 0],
         zoom: 2,
         minZoom: 2,
         maxZoom: 16,
         zoomControl: true,
         preferCanvas: false,
      })

      const url = cartoTileUrl(basemapDark)
      const tiles = L.tileLayer(url, CARTO_TILE_OPTIONS)
      tiles.addTo(map)
      tileLayerRef.current = tiles

      const fg = L.featureGroup().addTo(map)
      layerRef.current = fg
      mapInstanceRef.current = map

      const invalidate = () => {
         map.invalidateSize({ animate: false })
      }
      requestAnimationFrame(() => {
         invalidate()
         map.whenReady(() => {
            invalidate()
            requestAnimationFrame(invalidate)
         })
      })
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => invalidate()) : null
      ro?.observe(el)

      setMapReady(true)

      return () => {
         ro?.disconnect()
         setMapReady(false)
         tileLayerRef.current = null
         map.remove()
         mapInstanceRef.current = null
         layerRef.current = null
      }
      // basemapDark: initial tiles only; theme swaps in next effect
      // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; theme handled below
   }, [mounted])

   // Swap basemap when theme / persisted appearance changes
   useEffect(() => {
      const map = mapInstanceRef.current
      if (!map || !mapReady) return
      const url = cartoTileUrl(basemapDark)
      const prev = tileLayerRef.current
      if (prev && map.hasLayer(prev)) map.removeLayer(prev)
      const layer = L.tileLayer(url, CARTO_TILE_OPTIONS)
      layer.addTo(map)
      tileLayerRef.current = layer
   }, [mapReady, basemapDark])

   useEffect(() => {
      const map = mapInstanceRef.current
      const fg = layerRef.current
      if (!map || !fg || !mapReady) return

      fg.clearLayers()
      const bounds: L.LatLng[] = []
      const baseStyle: LeafletCircleMarkerStyle = markerStyle ?? {
         ...leafletMarkerPalettesFromRoot(document.documentElement).default,
         fillOpacity: 0.85,
         weight: 2,
      }

      for (const raw of points) {
         const lat = toFiniteNumber(raw.lat)
         const lng = toFiniteNumber(raw.lng)
         if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
         bounds.push(L.latLng(lat, lng))
         L.circleMarker([lat, lng], { ...baseStyle, interactive: true }).addTo(fg)
      }

      const scheduleFit = () => {
         map.invalidateSize({ animate: false })
         if (bounds.length > 0) {
            const key = bounds.map((ll) => `${ll.lat},${ll.lng}`).join('|')
            if (key !== lastFitKeyRef.current) {
               lastFitKeyRef.current = key
               try {
                  map.fitBounds(L.latLngBounds(bounds), { padding: [32, 32], maxZoom: 14 })
               } catch {
                  map.setView(bounds[0], 8)
               }
            }
         }
         if (fg.getLayers().length > 0) {
            fg.bringToFront()
         }
      }

      requestAnimationFrame(() => {
         scheduleFit()
         requestAnimationFrame(scheduleFit)
      })
      const t = window.setTimeout(scheduleFit, 120)

      return () => window.clearTimeout(t)
   }, [points, mapReady, markerStyle])

   const loadingClass =
      className ??
      'flex h-[280px] w-full items-center justify-center rounded-lg border border-border bg-card'

   if (!mounted) {
      return (
         <div className={loadingClass}>
            <span className="text-sm text-muted-foreground">Loading map…</span>
         </div>
      )
   }

   return (
      <div
         ref={mapRef}
         className={cn(
            'relative z-[1] w-full rounded-lg border border-border bg-muted/30',
            '[&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:min-h-[200px]',
            className ?? 'h-[280px]',
         )}
      />
   )
}
