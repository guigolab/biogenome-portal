'use client'

import { useTheme } from 'next-themes'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'

import type { GeoJsonGeometry, LocationFrequencyPoint } from '@/lib/api/coordinates'
import {
   leafletMarkerPalettesFromRoot,
   type LeafletCircleMarkerStyle,
} from '@/lib/portal/brandColorsFromDocument'
import { useAppearanceStore } from '@/stores/appearance-store'

export type MapViewProps = {
   points: LocationFrequencyPoint[]
   onPolygonChange: (geometry: GeoJsonGeometry | null) => void
   /** When null, drawn shapes are cleared from the map. */
   activePolygon: GeoJsonGeometry | null
   /** Pans the map (e.g. organism card selection). */
   selectedLatLng?: { lat: number; lng: number } | null
   /** Sample-frequency marker to render as selected (different color). */
   selectedFrequencyPoint?: { lng: number; lat: number } | null
   /** Highlight a marker while hovering a matching row in the species list. */
   hoverFrequencyPoint?: { lng: number; lat: number } | null
   /** Fired when the user clicks an aggregated sample marker (lng, lat match frequency API). */
   onMarkerClick?: (lng: number, lat: number) => void
   /** Clicking the basemap (tiles) clears frequency selection; marker clicks do not fire this. */
   onMapBackgroundClick?: () => void
}

const DRAW_EVENT_CREATED = 'draw:created' as const

const CARTO_ATTRIBUTION =
   '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const CARTO_TILE_OPTIONS = {
   attribution: CARTO_ATTRIBUTION,
   subdomains: 'abcd' as const,
   maxZoom: 20,
}

const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

function sameFrequencyCoord(
   a: { lng: number; lat: number },
   b: { lng: number; lat: number },
): boolean {
   return Math.abs(a.lng - b.lng) < 1e-7 && Math.abs(a.lat - b.lat) < 1e-7
}

export function MapView({
   points,
   onPolygonChange,
   activePolygon,
   selectedLatLng,
   selectedFrequencyPoint,
   hoverFrequencyPoint,
   onMarkerClick,
   onMapBackgroundClick,
}: MapViewProps) {
   const mapRef = useRef<HTMLDivElement>(null)
   const mapInstanceRef = useRef<L.Map | null>(null)
   const pointsLayerRef = useRef<L.FeatureGroup | null>(null)
   const lastFitPointsKeyRef = useRef<string>('')
   const drawLayerRef = useRef<L.FeatureGroup | null>(null)
   const onPolygonChangeRef = useRef(onPolygonChange)
   onPolygonChangeRef.current = onPolygonChange
   const onMarkerClickRef = useRef(onMarkerClick)
   onMarkerClickRef.current = onMarkerClick
   const onMapBackgroundClickRef = useRef(onMapBackgroundClick)
   onMapBackgroundClickRef.current = onMapBackgroundClick
   const [mounted, setMounted] = useState(false)
   const { resolvedTheme } = useTheme()
   const appearance = useAppearanceStore((s) => s.appearance)
   const tileLayerRef = useRef<L.TileLayer | null>(null)
   const [markerStyles, setMarkerStyles] = useState<{
      default: LeafletCircleMarkerStyle
      selected: LeafletCircleMarkerStyle
      hover: LeafletCircleMarkerStyle
   } | null>(null)

   useLayoutEffect(() => {
      if (typeof document === 'undefined') return
      setMarkerStyles(leafletMarkerPalettesFromRoot(document.documentElement))
   }, [resolvedTheme, appearance])

   /** Persisted appearance wins for light/dark; `system` uses next-themes. */
   const basemapDark = useMemo(() => {
      if (appearance === 'light') return false
      if (appearance === 'dark') return true
      return resolvedTheme === 'dark'
   }, [appearance, resolvedTheme])

   useEffect(() => {
      setMounted(true)
   }, [])

   // Init map + draw control once
   useEffect(() => {
      if (!mounted || !mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
         center: [20, 0],
         zoom: 2,
         minZoom: 2,
         maxZoom: 18,
         zoomControl: true,
      })

      const pointsLayer = L.featureGroup().addTo(map)
      const drawLayer = L.featureGroup().addTo(map)
      pointsLayerRef.current = pointsLayer
      drawLayerRef.current = drawLayer

      const drawControl = new L.Control.Draw({
         draw: {
            polyline: false,
            rectangle: {},
            circle: false,
            marker: false,
            circlemarker: false,
            polygon: {},
         },
         edit: {
            featureGroup: drawLayer,
            edit: false,
            remove: false,
         },
      })
      drawControl.addTo(map)

      const onCreated = (e: L.LeafletEvent & { layer: L.Layer }) => {
         drawLayer.clearLayers()
         drawLayer.addLayer(e.layer)
         const gj = (e.layer as L.Layer & { toGeoJSON: () => GeoJSON.Feature })?.toGeoJSON?.()
         const geometry =
            gj && gj.type === 'Feature' && gj.geometry ? (gj.geometry as unknown as GeoJsonGeometry) : null
         onPolygonChangeRef.current(geometry)
      }

      map.on(DRAW_EVENT_CREATED, onCreated)

      const onMapClick = (e: L.LeafletMouseEvent) => {
         const tilePane = map.getPane('tilePane')
         const t = e.originalEvent?.target as Node | undefined
         if (!tilePane || !t || !tilePane.contains(t)) return
         onMapBackgroundClickRef.current?.()
      }
      map.on('click', onMapClick)

      mapInstanceRef.current = map

      return () => {
         map.off('click', onMapClick)
         map.off(DRAW_EVENT_CREATED, onCreated)
         drawControl.remove()
         tileLayerRef.current = null
         map.remove()
         mapInstanceRef.current = null
         pointsLayerRef.current = null
         drawLayerRef.current = null
      }
   }, [mounted])

   // Basemap: persisted appearance when fixed light/dark; otherwise next-themes (system)
   useEffect(() => {
      const map = mapInstanceRef.current
      if (!map) return

      const url = basemapDark ? CARTO_DARK : CARTO_LIGHT
      const prev = tileLayerRef.current
      if (prev && map.hasLayer(prev)) {
         map.removeLayer(prev)
      }
      const layer = L.tileLayer(url, CARTO_TILE_OPTIONS)
      layer.addTo(map)
      tileLayerRef.current = layer
   }, [mounted, basemapDark])

   // Clear draw layer when parent clears polygon
   useEffect(() => {
      if (activePolygon === null && drawLayerRef.current) {
         drawLayerRef.current.clearLayers()
      }
   }, [activePolygon])

   // Render / update markers from API points
   useEffect(() => {
      const map = mapInstanceRef.current
      const pointsLayer = pointsLayerRef.current
      if (!map || !pointsLayer) return

      pointsLayer.clearLayers()
      const bounds: L.LatLng[] = []

      for (const item of points) {
         const [lng, lat] = item.coordinates
         if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
         bounds.push(L.latLng(lat, lng))
         const selected =
            selectedFrequencyPoint != null && sameFrequencyCoord(selectedFrequencyPoint, { lng, lat })
         const hovered =
            !selected &&
            hoverFrequencyPoint != null &&
            sameFrequencyCoord(hoverFrequencyPoint, { lng, lat })
         const palette = markerStyles ?? leafletMarkerPalettesFromRoot(document.documentElement)
         const style = selected ? palette.selected : hovered ? palette.hover : palette.default
         const marker = L.circleMarker([lat, lng], { ...style })
         marker.bindTooltip(String(item.count.toLocaleString()))
         marker.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e)
            onMarkerClickRef.current?.(lng, lat)
         })
         marker.addTo(pointsLayer)
      }

      if (bounds.length > 0) {
         const pointsKey = points
            .map((p) => `${p.coordinates[0]},${p.coordinates[1]},${p.count}`)
            .join('|')
         if (pointsKey !== lastFitPointsKeyRef.current) {
            lastFitPointsKeyRef.current = pointsKey
            map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 12 })
         }
      }
   }, [points, selectedFrequencyPoint, hoverFrequencyPoint, markerStyles])

   // Pan to selected organism (first coordinate not available here — parent passes lat/lng)
   useEffect(() => {
      if (!mapInstanceRef.current || !selectedLatLng) return
      mapInstanceRef.current.setView([selectedLatLng.lat, selectedLatLng.lng], 6, { animate: true })
   }, [selectedLatLng])

   if (!mounted) {
      return (
         <div className="flex h-full w-full items-center justify-center bg-card">
            <div className="text-muted-foreground">Loading map…</div>
         </div>
      )
   }

   return <div ref={mapRef} className="h-full w-full" />
}
