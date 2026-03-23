<template>
   <div class="bsr">
      <p class="bsr__intro">
         Please review all details below before submitting. Once submitted the biosample will be published to EBI BioSamples.
      </p>

      <!-- Core identifiers -->
      <div class="bsr__section">
         <h3 class="bsr__section-title">Core Identifiers</h3>
         <div class="bsr__grid">
            <div class="bsr__row">
               <span class="bsr__key">Sample identifier</span>
               <span class="bsr__val">{{ sampleStore.sampleIdentifier || '—' }}</span>
            </div>
            <div class="bsr__row">
               <span class="bsr__key">Taxonomic ID</span>
               <span class="bsr__val">{{ sampleStore.taxid || '—' }}</span>
            </div>
            <div class="bsr__row">
               <span class="bsr__key">Scientific name</span>
               <span class="bsr__val bsr__val--italic">{{ sampleStore.scientificName || '—' }}</span>
            </div>
         </div>
      </div>

      <!-- Checklist characteristics -->
      <div v-if="Object.keys(sampleStore.characterics).length" class="bsr__section">
         <h3 class="bsr__section-title">Checklist Characteristics</h3>
         <div class="bsr__grid">
            <div
               v-for="[k, v] in Object.entries(sampleStore.characterics)"
               :key="k"
               class="bsr__row"
            >
               <span class="bsr__key">{{ k }}</span>
               <span class="bsr__val">{{ v }}</span>
            </div>
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
   import { useSampleStore } from '../../../stores/sample-store'

   const sampleStore = useSampleStore()
</script>

<style lang="scss" scoped>
   .bsr {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
   }

   .bsr__intro {
      margin: 0;
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
   }

   .bsr__section {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
   }

   .bsr__section-title {
      margin: 0;
      padding: 0.75rem 1.125rem;
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.055em;
      color: #64748b;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
   }

   .bsr__grid {
      display: flex;
      flex-direction: column;
   }

   .bsr__row {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      padding: 0.6rem 1.125rem;
      border-bottom: 1px solid #f1f5f9;

      &:last-child { border-bottom: none; }

      &:nth-child(even) { background: #fafafa; }
   }

   .bsr__key {
      flex: 0 0 200px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #374151;
      word-break: break-word;
   }

   .bsr__val {
      flex: 1;
      font-size: 0.875rem;
      color: #1e293b;
      word-break: break-word;

      &--italic { font-style: italic; }
   }

   @media (max-width: 500px) {
      .bsr__row { flex-direction: column; gap: 0.2rem; }
      .bsr__key { flex: none; }
   }
</style>
