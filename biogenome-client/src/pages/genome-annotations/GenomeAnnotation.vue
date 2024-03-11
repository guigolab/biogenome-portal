<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'annotations' }" :label="t('annotationDetails.breadcrumb')" />
      <va-breadcrumbs-item active :label="name" />
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
      <KeyValueCard v-if="annotationSelectedMetadata.length" :metadata="metadata"
        :selected-metadata="annotationSelectedMetadata" />
      <div class="row row-equal">
        <!-- <div class="flex lg12 md12 sm12 xs12">
          <Jbrowse2 :assembly="assembly" :annotations="annotations" />
        </div> -->
        <div v-if="metadata && Object.keys(metadata).length" class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import AssemblyService from '../../services/clients/AssemblyService'
import { onMounted, ref } from 'vue'
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { Assembly, Details, TrackData } from '../../data/types'
import AnnotationService from '../../services/clients/AnnotationService'
import { useI18n } from 'vue-i18n'
import DetailsHeader from '../../components/ui/DetailsHeader.vue'
import KeyValueCard from '../../components/ui/KeyValueCard.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import { annotationSelectedMetadata } from '../../../config.json'
const { t } = useI18n()

const props = defineProps({
  name: String,
})
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)
const metadata = ref<Record<string, any>>({})

const details = ref<
  Details | any
>()
const assembly = ref<Assembly>()
const annotations = ref<TrackData[]>([])

const showJBrowse = ref(false)

onMounted(async () => {
  try {

    isLoading.value = true
    const { data } = await AnnotationService.getAnnotation(props.name)
    details.value = parseDetails(data)
    annotations.value.push(data)
    assembly.value = await getRelatedAssembly(data.assembly_accession)
  } catch (e) {
    errorMessage.value = e
  } finally {
    isLoading.value = false
  }
})
async function getRelatedAssembly(accession: string) {
  const { data } = await AssemblyService.getAssembly(accession)
  return data

}
function parseDetails(annotation: Record<string, any>) {
  const name = annotation.name
  const details: Details = {
    title: name,
    button1: {
      route: { name: 'organism', params: { taxid: annotation.taxid } },
      label: annotation.scientific_name
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
  