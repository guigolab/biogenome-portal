<template>
   <div class="cms-stat-strip">

      <!-- ── Zone A: KPI tiles ── -->
      <div class="cms-stat-strip__kpi-row">
         <div
            v-for="stat in rawStats"
            :key="stat.key"
            class="cms-stat-tile"
            :class="`cms-stat-tile--${TILE_META[stat.key]?.color ?? 'primary'}`"
         >
            <div class="cms-stat-tile__icon-badge" aria-hidden="true">
               <CmsIcon :name="TILE_META[stat.key]?.icon ?? 'fa-circle'" size="1rem" />
            </div>
            <div class="cms-stat-tile__body">
               <span class="cms-stat-tile__count">{{ stat.count.toLocaleString() }}</span>
               <span class="cms-stat-tile__label">{{ TILE_META[stat.key]?.label ?? stat.key }}</span>
            </div>
         </div>
      </div>

      <!-- ── Zone B: Organism status distributions ── -->
      <div class="cms-stat-strip__status-section">
         <div class="cms-stat-strip__status-heading">
            <CmsIcon name="fa-paw" size="0.75rem" class="cms-stat-strip__status-icon" />
            <span>Organism statuses</span>
         </div>

         <!-- Loading skeleton -->
         <div v-if="statusLoading" class="cms-stat-strip__status-rows">
            <div v-for="i in 3" :key="i" class="cms-status-row cms-status-row--skeleton">
               <div class="cms-skeleton-label" />
               <div class="cms-skeleton-pills">
                  <div v-for="j in 3" :key="j" class="cms-skeleton-pill" />
               </div>
            </div>
         </div>

         <div v-else class="cms-stat-strip__status-rows">
            <div
               v-for="row in statusRows"
               :key="row.field"
               class="cms-status-row"
            >
               <span class="cms-status-row__label">{{ row.label }}</span>
               <div class="cms-status-row__pills" role="list">
                  <span
                     v-for="(count, value) in row.data"
                     :key="value"
                     role="listitem"
                     class="cms-status-pill"
                     :class="`cms-status-pill--${resolveVariant(String(value))}`"
                  >
                     {{ formatValue(String(value)) }}
                     <span class="cms-status-pill__count">{{ count }}</span>
                  </span>
               </div>
            </div>
         </div>
      </div>

   </div>
</template>

<script setup lang="ts">
   import { onMounted, ref } from 'vue'
   import CmsIcon from '../ui/CmsIcon.vue'
   import type { DataModels } from '../../../data/types'
   import StatisticsService from '../../../services/StatisticsService'

   defineProps<{
      rawStats: { key: DataModels; count: number }[]
      isAdmin: boolean
   }>()

   /* ── Tile metadata ──────────────────────────────────────────────────────── */
   const TILE_META: Record<string, { icon: string; color: string; label: string }> = {
      organisms:     { icon: 'fa-paw',           color: 'primary', label: 'Species'       },
      assemblies:    { icon: 'fa-dna',            color: 'purple',  label: 'Assemblies'    },
      reads:         { icon: 'fa-folder',         color: 'slate',   label: 'Reads'         },
      biosamples:    { icon: 'fa-vial',           color: 'teal',    label: 'Biosamples'    },
      local_samples: { icon: 'fa-flask',          color: 'amber',   label: 'Local Samples' },
      annotations:   { icon: 'fa-bars-staggered', color: 'amber',   label: 'Annotations'   },
   }

   /* ── Status variant map (mirrors CmsStatusPill) ─────────────────────────── */
   const VARIANT_MAP: Record<string, string> = {
      sample_acquired: 'success',
      in_progress:     'warning',
      published:       'success',
      insdc_open:      'info',
      open:            'info',
      submitted:       'warning',
      in_assembly:     'warning',
      assemblies:      'info',
      reads:           'info',
      raw_data:        'neutral',
      pending_deletion:'danger',
   }

   function resolveVariant(value: string): string {
      return VARIANT_MAP[value] ?? 'neutral'
   }

   function formatValue(value: string): string {
      return value.replace(/_/g, ' ')
   }

   /* ── Status rows ─────────────────────────────────────────────────────────── */
   type StatusRow = {
      field: string
      label: string
      data: Record<string, number>
   }

   const NO_ENTRY = 'No Entry'
   const STATUS_FIELDS: { field: string; label: string }[] = [
      { field: 'goat_status',        label: 'GoaT'        },
      { field: 'insdc_status',       label: 'INSDC'       },
      { field: 'target_list_status', label: 'Target list' },
   ]

   const statusLoading = ref(true)
   const statusRows = ref<StatusRow[]>([])

   onMounted(async () => {
      try {
         const results = await Promise.all(
            STATUS_FIELDS.map((f) =>
               StatisticsService.getModelFieldStats('organisms', f.field, {}).then((res) => ({
                  field: f.field,
                  label: f.label,
                  // Filter out the sentinel "No Entry" key from the backend
                  data: Object.fromEntries(
                     Object.entries(res.data as Record<string, number>).filter(
                        ([k]) => k !== NO_ENTRY,
                     ),
                  ),
               })),
            ),
         )
         // Only show rows that actually have data
         statusRows.value = results.filter((r) => Object.keys(r.data).length > 0)
      } catch {
         statusRows.value = []
      } finally {
         statusLoading.value = false
      }
   })
</script>

<style lang="scss" scoped>
   /* ─── Strip shell ─── */
   .cms-stat-strip {
      display: flex;
      flex-direction: column;
      gap: 0;
      background: var(--cms-bg-surface);
      border: 1px solid var(--cms-border);
      border-radius: var(--cms-radius-card);
      box-shadow: var(--cms-shadow-sm);
      overflow: hidden;
   }

   /* ─── Zone A: KPI tiles ─── */
   .cms-stat-strip__kpi-row {
      display: flex;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--cms-border);
   }

   .cms-stat-tile {
      --_tile-color: var(--cms-primary);
      --_tile-bg:    var(--cms-primary-soft);

      &--teal   { --_tile-color: var(--cms-info);    --_tile-bg: var(--cms-info-soft);    }
      &--danger { --_tile-color: var(--cms-danger);  --_tile-bg: var(--cms-danger-soft);  }
      &--purple { --_tile-color: var(--cms-purple);  --_tile-bg: var(--cms-purple-soft);  }
      &--amber  { --_tile-color: var(--cms-warning); --_tile-bg: var(--cms-warning-soft); }
      &--slate  { --_tile-color: var(--cms-slate);   --_tile-bg: var(--cms-slate-soft);   }

      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1 1 140px;
      padding: 1rem 1.25rem;
      border-right: 1px solid var(--cms-border);
      min-width: 0;

      &:last-child { border-right: none; }
   }

   .cms-stat-tile__icon-badge {
      flex-shrink: 0;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 8px;
      background: var(--_tile-bg);
      color: var(--_tile-color);
      display: flex;
      align-items: center;
      justify-content: center;
   }

   .cms-stat-tile__body {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
   }

   .cms-stat-tile__count {
      font-size: 1.375rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1;
      color: var(--cms-text);
   }

   .cms-stat-tile__label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--cms-text-muted);
      text-transform: capitalize;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
   }

   /* ─── Zone B: status distribution ─── */
   .cms-stat-strip__status-section {
      padding: 0.75rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
   }

   .cms-stat-strip__status-heading {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--cms-text-faint);
   }

   .cms-stat-strip__status-icon {
      opacity: 0.5;
   }

   .cms-stat-strip__status-rows {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
   }

   .cms-status-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
   }

   .cms-status-row__label {
      flex-shrink: 0;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--cms-text-muted);
      width: 5.5rem;
   }

   .cms-status-row__pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
   }

   /* ─── Status pills ─── */
   .cms-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: capitalize;
      white-space: nowrap;

      &--success { background: var(--cms-success-soft); color: var(--cms-success-text); }
      &--warning { background: var(--cms-warning-soft); color: var(--cms-warning-text); }
      &--info    { background: var(--cms-info-soft);    color: var(--cms-info-text);    }
      &--danger  { background: var(--cms-danger-soft);  color: var(--cms-danger-text);  }
      &--neutral { background: var(--cms-border);       color: var(--cms-text-muted);   }
   }

   .cms-status-pill__count {
      font-weight: 700;
      opacity: 0.85;
   }

   /* ─── Skeleton loader ─── */
   @keyframes cms-shimmer {
      0%   { background-position: -600px 0 }
      100% { background-position:  600px 0 }
   }

   %shimmer {
      background: linear-gradient(90deg, var(--cms-border) 25%, var(--cms-bg-muted) 50%, var(--cms-border) 75%);
      background-size: 600px 100%;
      animation: cms-shimmer 1.4s ease-in-out infinite;
      border-radius: 6px;
   }

   .cms-skeleton-label {
      @extend %shimmer;
      flex-shrink: 0;
      width: 5.5rem;
      height: 0.75rem;
   }

   .cms-skeleton-pills {
      display: flex;
      gap: 0.35rem;
   }

   .cms-skeleton-pill {
      @extend %shimmer;
      height: 1.25rem;
      width: 4.5rem;
      border-radius: 999px;
   }

   /* ─── Responsive ─── */
   @media (max-width: 768px) {
      .cms-stat-tile {
         flex: 1 1 120px;
         padding: 0.875rem 1rem;
      }

      .cms-stat-tile__count {
         font-size: 1.15rem;
      }
   }

   @media (max-width: 480px) {
      .cms-stat-strip__kpi-row {
         display: grid;
         grid-template-columns: 1fr 1fr;
      }

      .cms-stat-tile {
         border-right: 1px solid var(--cms-border);
         border-bottom: 1px solid var(--cms-border);

         &:nth-child(even) { border-right: none; }
         &:last-child      { border-bottom: none; }
      }
   }
</style>
