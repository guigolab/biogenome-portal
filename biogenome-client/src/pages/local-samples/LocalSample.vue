<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'local_samples' }" :label="t('localSampleDetails.breadcrumb')" />
    <va-breadcrumbs-item active :label="id" />
  </va-breadcrumbs>
  <va-divider />
  <va-skeleton v-if="isLoading" height="90vh" />
  <div v-else-if="errorMessage">
    <va-card stripe stripe-color="danger">
      <va-card-content>
        {{ errorMessage }}
      </va-card-content>
    </va-card>
  </div>
  <div v-else>
    <DetailsHeader :details="details" />
    <KeyValueCard v-if="localSampleSelectedMetadata.length && metadata" :metadata="metadata"
      :selected-metadata="localSampleSelectedMetadata" />
    <div class="row row-equal">
      <div class="flex lg6 md6 sm12 xs12 chart">
        <Suspense>
          <MapCard :model="'local_sample'" :id="id" />
          <template #fallback>
          </template>
        </Suspense>
      </div>
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import LocalSampleService from '../../services/clients/LocalSampleService'
import { useI18n } from 'vue-i18n'
import { Details } from '../../data/types'
import { localSampleSelectedMetadata } from '../../../config.json'
import KeyValueCard from '../../components/ui/KeyValueCard.vue'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import MapCard from '../../components/ui/MapCard.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const details = ref<
  Details | any
>()
const { t } = useI18n()
const props = defineProps<{
  id: string
}>()
const metadata = ref<Record<string, any> | null>(null)

onMounted(async () => {
  try {
    isLoading.value = true
    const { data } = await LocalSampleService.getLocalSample(props.id)
    // localSample.value = {...data}
    if (data.metadata) metadata.value = data.metadata
    details.value = parseDetails(data)

  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
  }
})
function parseDetails(localSample: Record<string, any>) {
  const id = localSample.local_id
  const details: Details = {
    title: id,
    button1: {
      route: { name: 'organism', params: { taxid: localSample.taxid } },
      label: localSample.scientific_name
    }
  }
  return details
}
</script>
  
<style lang="scss">
.chart {
  height: 400px;
}

.row-equal .flex {
  .va-card {
    height: 100%;
  }
}

.va-card {
  margin-bottom: 0 !important;

  &__title {
    display: flex;
    justify-content: space-between;
  }
}

.list__item+.list__item {
  margin-top: 10px;
}
</style>
  