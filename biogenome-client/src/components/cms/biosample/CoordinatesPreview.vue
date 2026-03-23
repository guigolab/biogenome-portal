<template>
   <div class="cpv">
      <!-- Header -->
      <div class="cpv__header">
         <div class="cpv__header-left">
            <svg class="cpv__header-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
               <path d="M8 1a5 5 0 015 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 015-5z" stroke="#475569" stroke-width="1.4" fill="rgba(71,85,105,.1)"/>
               <circle cx="8" cy="6" r="1.5" fill="#475569"/>
            </svg>
            <span class="cpv__header-title">Location Preview</span>
         </div>
         <span
            class="cpv__badge"
            :class="isAutoDetected ? 'cpv__badge--auto' : (hasFields ? 'cpv__badge--manual' : 'cpv__badge--idle')"
         >
            {{ isAutoDetected ? 'Auto' : (hasFields ? 'Manual' : 'Idle') }}
         </span>
      </div>

      <!-- Map area -->
      <div class="cpv__map-wrap">
         <LocationsMap
            v-if="mapKey"
            :key="mapKey"
            :locations="currentLocation"
            :interaction-disabled="true"
         />
         <!-- Placeholder overlay when no valid coords -->
         <transition name="cpv-fade">
            <div v-if="!currentLocation.length" class="cpv__map-placeholder">
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" stroke="#94a3b8" stroke-width="1.5" fill="rgba(148,163,184,.08)"/>
                  <circle cx="12" cy="9" r="2.5" stroke="#94a3b8" stroke-width="1.5"/>
               </svg>
               <p class="cpv__map-placeholder-text">
                  {{ hasFields ? 'Enter values in the form to preview location' : 'Select lat/lon fields below' }}
               </p>
            </div>
         </transition>
      </div>

      <!-- Live coordinate readout -->
      <div class="cpv__coords" :class="{ 'cpv__coords--valid': currentLocation.length }">
         <template v-if="currentLat !== null && currentLon !== null">
            <span class="cpv__coord-item">
               <span class="cpv__coord-label">Lat</span>
               <span class="cpv__coord-val">{{ currentLat.toFixed(5) }}</span>
            </span>
            <span class="cpv__coord-sep" aria-hidden="true">/</span>
            <span class="cpv__coord-item">
               <span class="cpv__coord-label">Lon</span>
               <span class="cpv__coord-val">{{ currentLon.toFixed(5) }}</span>
            </span>
         </template>
         <span v-else class="cpv__coord-empty">No valid coordinates yet</span>
      </div>

      <!-- Field selectors -->
      <div class="cpv__fields">
         <div class="cpv__field-row">
            <label class="cpv__field-label" :for="`cpv-lat-${uid}`">Lat field</label>
            <select
               :id="`cpv-lat-${uid}`"
               v-model="latitudeField"
               class="cpv__select"
               @change="onManualChange"
            >
               <option value="">— none —</option>
               <option v-for="f in selectableFields" :key="f" :value="f">{{ f }}</option>
            </select>
         </div>
         <div class="cpv__field-row">
            <label class="cpv__field-label" :for="`cpv-lon-${uid}`">Lon field</label>
            <select
               :id="`cpv-lon-${uid}`"
               v-model="longitudeField"
               class="cpv__select"
               @change="onManualChange"
            >
               <option value="">— none —</option>
               <option v-for="f in selectableFields" :key="f" :value="f">{{ f }}</option>
            </select>
         </div>
         <button
            v-if="!isAutoDetected && (autoLat || autoLon)"
            class="cpv__reset-btn"
            type="button"
            @click="resetToAuto"
         >
            Reset to auto-detected
         </button>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { computed, ref, watch } from 'vue'
   import { useSampleStore } from '../../../stores/sample-store'
   import LocationsMap from '../../LocationsMap.vue'

   const props = defineProps<{
      availableFields?: string[]
   }>()

   const sampleStore = useSampleStore()
   const uid = Math.random().toString(36).slice(2, 7)

   const latitudeField = ref('')
   const longitudeField = ref('')
   const manuallyOverridden = ref(false)
   const mapKey = ref(1) // force-remount map when needed

   const LAT_RE = /lat(itude)?/i
   const LON_RE = /lon(gitude)?|lng/i

   // All selectable fields: prefer prop list, fall back to filled characterics keys
   const selectableFields = computed<string[]>(() =>
      props.availableFields?.length
         ? props.availableFields
         : Object.keys(sampleStore.characterics),
   )

   // Auto-detect best field names
   const autoLat = computed(() => selectableFields.value.find((f) => LAT_RE.test(f)) ?? '')
   const autoLon = computed(() => selectableFields.value.find((f) => LON_RE.test(f)) ?? '')

   const isAutoDetected = computed(
      () =>
         !manuallyOverridden.value &&
         Boolean(latitudeField.value || longitudeField.value) &&
         latitudeField.value === autoLat.value &&
         longitudeField.value === autoLon.value,
   )

   const hasFields = computed(() => Boolean(latitudeField.value || longitudeField.value))

   function applyAutoDetect() {
      if (autoLat.value && !latitudeField.value) latitudeField.value = autoLat.value
      if (autoLon.value && !longitudeField.value) longitudeField.value = autoLon.value
   }

   function resetToAuto() {
      manuallyOverridden.value = false
      latitudeField.value = autoLat.value
      longitudeField.value = autoLon.value
   }

   function onManualChange() {
      manuallyOverridden.value = true
   }

   // Run auto-detect when field list is first populated
   watch(selectableFields, (fields) => {
      if (fields.length) applyAutoDetect()
   }, { immediate: true })

   // Reactive coordinates from store
   const currentLat = computed<number | null>(() => {
      if (!latitudeField.value) return null
      const v = parseFloat(sampleStore.characterics[latitudeField.value])
      return isNaN(v) ? null : v
   })

   const currentLon = computed<number | null>(() => {
      if (!longitudeField.value) return null
      const v = parseFloat(sampleStore.characterics[longitudeField.value])
      return isNaN(v) ? null : v
   })

   const currentLocation = computed<Record<string, any>[]>(() => {
      if (currentLat.value === null || currentLon.value === null) return []
      return [
         {
            taxid: sampleStore.taxid,
            scientific_name: sampleStore.scientificName,
            sample_accession: sampleStore.sampleIdentifier,
            coordinates: [currentLon.value, currentLat.value],
            is_local_sample: true,
         },
      ]
   })

   // Force-remount map when field selection changes to ensure Leaflet picks up new container size
   watch([latitudeField, longitudeField], () => {
      mapKey.value++
   })
</script>

<style lang="scss" scoped>
   .cpv {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
   }

   /* Header */
   .cpv__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.875rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 0.5rem;
   }

   .cpv__header-left {
      display: flex;
      align-items: center;
      gap: 0.4rem;
   }

   .cpv__header-icon {
      flex-shrink: 0;
      opacity: 0.7;
   }

   .cpv__header-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #374151;
      letter-spacing: -0.005em;
   }

   .cpv__badge {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.125rem 0.45rem;
      border-radius: 4px;

      &--auto {
         background: rgba(34, 197, 94, 0.12);
         color: #15803d;
      }
      &--manual {
         background: rgba(59, 130, 246, 0.1);
         color: #1d4ed8;
      }
      &--idle {
         background: rgba(0, 0, 0, 0.05);
         color: #6b7280;
      }
   }

   /* Map */
   .cpv__map-wrap {
      position: relative;
      height: 200px;
      flex-shrink: 0;
      background: #f1f5f9;

      :deep(.map-container),
      :deep(.leaflet-map) {
         width: 100%;
         height: 200px;
      }
   }

   .cpv__map-placeholder {
      position: absolute;
      inset: 0;
      z-index: 1000;
      background: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
   }

   .cpv__map-placeholder-text {
      margin: 0;
      font-size: 0.75rem;
      color: #94a3b8;
      text-align: center;
      line-height: 1.4;
      max-width: 160px;
   }

   /* Fade transition for placeholder */
   .cpv-fade-enter-active,
   .cpv-fade-leave-active { transition: opacity 0.25s ease; }
   .cpv-fade-enter-from,
   .cpv-fade-leave-to { opacity: 0; }

   /* Coordinate readout */
   .cpv__coords {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      min-height: 2.25rem;
   }

   .cpv__coord-item {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
   }

   .cpv__coord-label {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
   }

   .cpv__coord-val {
      font-size: 0.8125rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: #1e293b;
   }

   .cpv__coord-sep {
      font-size: 0.75rem;
      color: #cbd5e1;
      user-select: none;
   }

   .cpv__coord-empty {
      font-size: 0.75rem;
      color: #9ca3af;
      font-style: italic;
   }

   /* Field selectors */
   .cpv__fields {
      padding: 0.75rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border-top: 1px solid #f1f5f9;
   }

   .cpv__field-row {
      display: grid;
      grid-template-columns: 2.5rem 1fr;
      align-items: center;
      gap: 0.5rem;
   }

   .cpv__field-label {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      white-space: nowrap;
   }

   .cpv__select {
      width: 100%;
      padding: 0.3rem 0.5rem;
      font-size: 0.8125rem;
      color: #374151;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.12s;
      appearance: auto;

      &:focus { border-color: #64748b; box-shadow: 0 0 0 2px rgba(100,116,139,.1); }
   }

   .cpv__reset-btn {
      align-self: flex-start;
      margin-top: 0.125rem;
      font-size: 0.6875rem;
      color: #3b82f6;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;

      &:hover { color: #1d4ed8; }
   }
</style>
