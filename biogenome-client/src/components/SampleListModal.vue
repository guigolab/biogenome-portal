<template>
    <h3 class="va-h3">{{ t('items.data.results') }} {{ samples.length }}</h3>
    <p class="light-paragraph mb-15">
      Latitude: {{ lat }}; Longitude: {{ lng }}
    </p>
    <div class="custom-sample-list">
      <template v-for="(rowData, idx) in samples" :key="rowData.sample_accession">
        <div class="sample-list-item">
          <div class="sample-list-content">
            <VaChip flat class="sample-chip" @click="$emit('route', { name: 'item', params: { model: 'organisms', id: (rowData as Record<string, any>).taxid } })">
              {{ (rowData as Record<string, any>).scientific_name }}
            </VaChip>
            <VaChip flat class="sample-chip" @click="$emit('route', { name: 'item', params: { model: (rowData as Record<string, any>).is_local_sample ? 'local_samples' : 'biosamples', id: (rowData as Record<string, any>).sample_accession } })">
              {{ (rowData as Record<string, any>).sample_accession }}
            </VaChip>
          </div>
        </div>
      </template>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const props = defineProps({
  samples: {
    type: Array,
    required: true
  },
  lat: [String, Number],
  lng: [String, Number]
})
const emit = defineEmits(['update:modelValue', 'route'])
</script>

<style scoped lang="scss">
.custom-sample-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.sample-list-item {
  background: var(--va-background-secondary);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.sample-list-content {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.sample-chip {
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.25rem 1rem;
  border-radius: 6px;
  transition: background 0.2s;
  &:hover {
    background: var(--va-primary-light);
    color: var(--va-primary);
  }
}
</style> 