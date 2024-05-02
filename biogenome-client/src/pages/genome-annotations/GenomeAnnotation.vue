<template>
  <div :key="props.name">
    <DetailsHeader :details="details" />
    <VaTabs v-model="tab">
      <template #tabs>
        <VaTab label="Metadata" name="metadata"></VaTab>
        <VaTab v-if="annotations.length" label="Genome Browser" name="jbrowse"></VaTab>
      </template>
    </VaTabs>
    <VaDivider></VaDivider>
    <div class="row" v-if="tab === 'metadata'">
      <div v-if="metadata && Object.keys(metadata).length" class="flex lg12 md12 sm12 xs12">
        <MetadataTreeCard :metadata="metadata" />
      </div>
    </div>
    <div class="row" v-else>
      <div class="flex lg12 md12 sm12 xs12">
        <Jbrowse2 :assembly="assembly" :annotations="annotations" />
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
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
const { t } = useI18n()

const tab = ref('metadata')
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