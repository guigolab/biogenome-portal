<template>
  <div class="stats-accordion-card">
    <div class="stats-dropdown-close">
      <VaButton icon="fa-close" preset="secondary" color="danger" size="small" @click="$emit('close')" />
    </div>
    <div v-for="model in filteredCounts" :key="model.key" class="stats-accordion-item">
      <div class="stats-accordion-header" @click="toggleAccordion(model.key)">
        <span class="va-h6">{{ model.key }}</span>
        <span class="va-text-secondary ml-2">{{ model.value }}</span>
        <VaIcon :name="openedModel === model.key ? 'va-arrow-up' : 'va-arrow-down'" class="accordion-arrow" />
      </div>
      <div v-if="openedModel === model.key" class="stats-accordion-content">
        <div class="stats-actions-row">
          <VaButton size="small" preset="secondary" icon="fa-file-arrow-down" @click.stop="download('jsonl', model.key)">
            JSONL
          </VaButton>
          <VaButton size="small" preset="secondary" icon="fa-file-arrow-down" @click.stop="download('tsv', model.key)">
            TSV
          </VaButton>
        </div>
        <div v-if="statsLoading && !infiniteLoading" class="stats-table-loading">
          <VaInnerLoading :loading="true" />
        </div>
        <div v-else>
          <div class="stats-infinite-scroll-wrapper">
            <VaInfiniteScroll
              v-if="openedModel === model.key"
              :disabled="infiniteLoading || statsLoading || allLoaded"
              :load="async () => await fetchMoreRecords(model.key)"
              :offset="100"
            >
              <div class="custom-sample-list">
                <div v-for="row in relatedRecords" :key="row.id || row.accession || row.taxid || row.local_id || row.name" class="sample-list-item">
                  <template v-if="model.key === 'organisms'">
                    <span class="va-text-secondary" style="font-style: italic">{{ row.scientific_name }}</span>
                    <RouterLink :to="{ name: 'item', params: { model: 'organisms', id: row.taxid } }" target="_blank" class="va-link  ml-2">
                      {{ row.taxid }}
                    </RouterLink>
                  </template>
                  <template v-else-if="model.key === 'biosamples' || model.key === 'assemblies'">
                    <span class="va-text-secondary" style="font-style: italic">{{ row.scientific_name }}</span>
                    <RouterLink :to="{ name: 'item', params: { model: model.key, id: row.accession } }" target="_blank" class="va-link ml-2">
                      {{ row.accession }}
                    </RouterLink>
                  </template>
                  <template v-else-if="model.key === 'annotations'">
                    <span class="va-text-secondary" style="font-style: italic">{{ row.scientific_name }}</span>
                    <RouterLink :to="{ name: 'item', params: { model: 'annotations', id: row.name } }" target="_blank" class="va-link ml-2">
                      {{ row.name }}
                    </RouterLink>
                  </template>
                  <template v-else-if="model.key === 'local_samples'">
                    <span class="va-text-secondary" style="font-style: italic">{{ row.scientific_name }}</span>
                    <RouterLink :to="{ name: 'item', params: { model: 'local_samples', id: row.local_id } }" target="_blank" class="va-link ml-2">
                      {{ row.local_id }}
                    </RouterLink>
                  </template>
                  <template v-else-if="model.key === 'experiments'">
                    <span class="va-text-secondary" style="font-style: italic">{{ row.scientific_name || row.metadata.scientific_name }}</span>
                    <RouterLink :to="{ name: 'item', params: { model: 'experiments', id: row.experiment_accession } }" target="_blank" class="va-link ml-2">
                      {{ row.experiment_accession }}
                    </RouterLink>
                  </template>
                </div>
              </div>
              <div v-if="infiniteLoading" class="infinite-loading-indicator">
                <VaInnerLoading :loading="true" />
              </div>
            </VaInfiniteScroll>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DataModels } from '../data/types'
import GeoLocationService from '../services/GeoLocationService';
import { useItemStore } from '../stores/items-store';

const props = defineProps<{
  filteredCounts: { key: string, value: number }[]
  polygon: Record<string, any> | null
  taxid?: string
}>()
const itemStore = useItemStore()
const openedModel = ref<string | null>(null)
const relatedRecords = ref<Record<string, any>[]>([])
const offset = ref(0)
const statsPageSize = 10
const statsTotal = ref(0)
const statsLoading = ref(false)
const infiniteLoading = ref(false)
const allLoaded = ref(false)
const emit = defineEmits(['fetch-related-records', 'download', 'fetch-more-records', 'close'])


function toggleAccordion(modelKey: string) {
  if (openedModel.value === modelKey) {
    openedModel.value = null
  } else {
    openedModel.value = modelKey
    offset.value = 0
    relatedRecords.value = []
    fetchRecords(modelKey)
    setTimeout(() => {
        const scroller = document.querySelector('.stats-infinite-scroll-wrapper')
        if (scroller) scroller.scrollTop = 0
    }, 0)
  }
}

async function fetchRecords(modelKey: string) {
  statsLoading.value = true
  const query = { polygon: props.polygon, taxid: props.taxid, model: modelKey, offset:offset.value, limit: statsPageSize }
  try {
    const { data } = await GeoLocationService.lookupRelatedModelData(query, modelKey as DataModels)
    if (offset.value === 0) {
      relatedRecords.value = [...data.data]
    } else {
      relatedRecords.value = [...relatedRecords.value, ...data.data]
    }
    statsTotal.value = data.total
    allLoaded.value = relatedRecords.value.length >= data.total
    offset.value = offset.value + statsPageSize
  } catch (e) {
    itemStore.catchError(e)
  } finally {
    statsLoading.value = false
    infiniteLoading.value = false
  }
}

async function fetchMoreRecords(modelKey: string) {
  if (infiniteLoading.value || allLoaded.value) return;
  infiniteLoading.value = true;
  const query = { polygon: props.polygon, taxid: props.taxid, model: modelKey, offset: offset.value, limit: statsPageSize };
  try {
    const { data } = await GeoLocationService.lookupRelatedModelData(query, modelKey as DataModels);
    const newRecords = data.data;
    relatedRecords.value = [...relatedRecords.value, ...newRecords];
    statsTotal.value = data.total;
    allLoaded.value = relatedRecords.value.length >= data.total;
    offset.value = offset.value + statsPageSize;
  } catch (e) {
    itemStore.catchError(e);
  } finally {
    infiniteLoading.value = false;
  }
}

function download(format: 'jsonl' | 'tsv', modelKey: string) {
  // Download logic (call backend or use itemStore)
  const query = { polygon: props.polygon, taxid: props.taxid, model: modelKey }
  GeoLocationService.getRelatedData(query).then(({ data }) => {
    itemStore.downloadFile(modelKey as DataModels, data, format)
  })
}
</script>

<style scoped lang="scss">
.stats-accordion-card {
  position: absolute;
  top: 2.5rem;
  right: 2.5rem;
  width: 350px;
  background: var(--va-background-primary);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  gap: 0.5rem;
}
.stats-dropdown-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 3100;
}
.stats-accordion-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 1rem;
  font-weight: 600;
  user-select: none;
}
.accordion-arrow {
  margin-left: auto;
  font-size: 1.2rem;
}
.stats-accordion-item {
  padding: 0.5rem;
  border-bottom: 1px solid var(--va-background-element);
}
.stats-accordion-content {
  margin-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.stats-actions-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.stats-key-value {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}
.stats-table-loading {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stats-infinite-scroll-wrapper {
  position: relative;
  scrollbar-width: thin;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
  height: 200px;
  
}
.infinite-loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem 0;
}
.all-loaded-indicator {
  font-size: 0.95rem;
  color: var(--va-secondary);
}
.custom-sample-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.sample-list-item {
  background: var(--va-background-secondary);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  margin-bottom: 0.25rem;
  gap: 1.5rem;
}
</style> 