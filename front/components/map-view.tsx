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
import { CARTO_TILE_OPTIONS, cartoTileUrl } from '@/lib/portal/cartoBasemap'
import { useAppearanceStore } from '@/stores/appearance-store'

export type FrequencyHighlightPoint = {
   lng: number
   lat: number
   label?: string
}

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
   hoverFrequencyPoint?: FrequencyHighlightPoint | null
   /** Fired when the user clicks an aggregated sample marker (lng, lat match frequency API). */
   onMarkerClick?: (lng: number, lat: number) => void
   /** Clicking the basemap (tiles) clears frequency selection; marker clicks do not fire this. */
   onMapBackgroundClick?: () => void
}

const DRAW_EVENT_CREATED = 'draw:created' as const

function coordKey(lng: number, lat: number): string {
   return `${lng}:${lat}`
}

type MarkerPalette = {
   default: LeafletCircleMarkerStyle
   selected: LeafletCircleMarkerStyle
   hover: LeafletCircleMarkerStyle
}

type MarkerMeta = {
   countLabel: string
}

function applyHighlight(
   markersByKey: Map<string, L.CircleMarker>,
   markerMetaByKey: Map<string, MarkerMeta>,
   highlighted: { selected: L.CircleMarker | null; hover: L.CircleMarker | null },
   palette: MarkerPalette,
   selectedPoint: { lng: number; lat: number } | null | undefined,
   hoverPoint: FrequencyHighlightPoint | null | undefined,
): { selected: L.CircleMarker | null; hover: L.CircleMarker | null } {
   const resetMarker = (marker: L.CircleMarker | null) => {
      if (!marker) return
      const key = (marker as L.CircleMarker & { _coordKey?: string })._coordKey
      const meta = key ? markerMetaByKey.get(key) : undefined
      marker.setStyle({ ...palette.default })
      if (meta) marker.setTooltipContent(meta.countLabel)
      marker.closeTooltip()
   }

   const nextSelectedKey =
      selectedPoint != null ? coordKey(selectedPoint.lng, selectedPoint.lat) : null
   const nextHoverKey = hoverPoint != null ? coordKey(hoverPoint.lng, hoverPoint.lat) : null

   const prevSelected = highlighted.selected
   const prevHover = highlighted.hover
   const prevSelectedKey = prevSelected
      ? (prevSelected as L.CircleMarker & { _coordKey?: string })._coordKey
      : null
   const prevHoverKey = prevHover
      ? (prevHover as L.CircleMarker & { _coordKey?: string })._coordKey
      : null

   if (prevSelected && prevSelectedKey !== nextSelectedKey) {
      resetMarker(prevSelected)
   }
   if (prevHover && prevHoverKey !== nextHoverKey && prevHover !== prevSelected) {
      resetMarker(prevHover)
   }

   let nextSelectedMarker: L.CircleMarker | null = null
   let nextHoverMarker: L.CircleMarker | null = null

   if (nextSelectedKey) {
      const marker = markersByKey.get(nextSelectedKey) ?? null
      if (marker) {
         marker.setStyle({ ...palette.selected })
         nextSelectedMarker = marker
      }
   }

   if (nextHoverKey && nextHoverKey !== nextSelectedKey) {
      const marker = markersByKey.get(nextHoverKey) ?? null
      if (marker) {
         marker.setStyle({ ...palette.hover })
         const label = hoverPoint?.label?.trim()
         if (label) {
            marker.setTooltipContent(label)
            marker.openTooltip()
         }
         nextHoverMarker = marker
      }
   }

   return { selected: nextSelectedMarker, hover: nextHoverMarker }
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
   const lastFitPointsRef = useRef<LocationFrequencyPoint[] | null>(null)
   const markersByKeyRef = useRef<Map<string, L.CircleMarker>>(new Map())
   const markerMetaByKeyRef = useRef<Map<string, MarkerMeta>>(new Map())
   const highlightedRef = useRef<{ selected: L.CircleMarker | null; hover: L.CircleMarker | null }>({
      selected: null,
      hover: null,
   })
   const drawLayerRef = useRef<L.FeatureGroup | null>(null)
   const onPolygonChangeRef = useRef(onPolygonChange)
   onPolygonChangeRef.current = onPolygonChange
   const onMarkerClickRef = useRef(onMarkerClick)
   onMarkerClickRef.current = onMarkerClick
   const onMapBackgroundClickRef = useRef(onMapBackgroundClick)
   onMapBackgroundClickRef.current = onMapBackgroundClick
   const selectedFrequencyPointRef = useRef(selectedFrequencyPoint)
   selectedFrequencyPointRef.current = selectedFrequencyPoint
   const hoverFrequencyPointRef = useRef(hoverFrequencyPoint)
   hoverFrequencyPointRef.current = hoverFrequencyPoint
   const [mounted, setMounted] = useState(false)
   const { resolvedTheme } = useTheme()
   const appearance = useAppearanceStore((s) => s.appearance)
   const tileLayerRef = useRef<L.TileLayer | null>(null)
   const [markerStyles, setMarkerStyles] = useState<MarkerPalette | null>(null)

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
         renderer: L.canvas(),
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
         markersByKeyRef.current.clear()
         markerMetaByKeyRef.current.clear()
         highlightedRef.current = { selected: null, hover: null }
      }
   }, [mounted])

   // Basemap: persisted appearance when fixed light/dark; otherwise next-themes (system)
   useEffect(() => {
      const map = mapInstanceRef.current
      if (!map) return

      const url = cartoTileUrl(basemapDark)
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

   // Build markers when points or palette change (not on hover/selection)
   useEffect(() => {
      const map = mapInstanceRef.current
      const pointsLayer = pointsLayerRef.current
      if (!map || !pointsLayer) return

      const palette = markerStyles ?? leafletMarkerPalettesFromRoot(document.documentElement)

      pointsLayer.clearLayers()
      markersByKeyRef.current.clear()
      markerMetaByKeyRef.current.clear()
      highlightedRef.current = { selected: null, hover: null }

      const bounds: L.LatLng[] = []

      for (const item of points) {
         const [lng, lat] = item.coordinates
         if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
         bounds.push(L.latLng(lat, lng))

         const key = coordKey(lng, lat)
         const countLabel = String(item.count.toLocaleString())
         const marker = L.circleMarker([lat, lng], { ...palette.default })
         ;(marker as L.CircleMarker & { _coordKey?: string })._coordKey = key
         marker.bindTooltip(countLabel)
         marker.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e)
            onMarkerClickRef.current?.(lng, lat)
         })
         marker.addTo(pointsLayer)
         markersByKeyRef.current.set(key, marker)
         markerMetaByKeyRef.current.set(key, { countLabel })
      }

      if (bounds.length > 0 && points !== lastFitPointsRef.current) {
         lastFitPointsRef.current = points
         map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 12 })
      }

      highlightedRef.current = applyHighlight(
         markersByKeyRef.current,
         markerMetaByKeyRef.current,
         highlightedRef.current,
         palette,
         selectedFrequencyPointRef.current,
         hoverFrequencyPointRef.current,
      )
   }, [points, markerStyles])

   // O(1) highlight updates on hover/selection (no full marker rebuild)
   useEffect(() => {
      const palette = markerStyles ?? leafletMarkerPalettesFromRoot(document.documentElement)
      highlightedRef.current = applyHighlight(
         markersByKeyRef.current,
         markerMetaByKeyRef.current,
         highlightedRef.current,
         palette,
         selectedFrequencyPoint,
         hoverFrequencyPoint,
      )
   }, [selectedFrequencyPoint, hoverFrequencyPoint, markerStyles])

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
