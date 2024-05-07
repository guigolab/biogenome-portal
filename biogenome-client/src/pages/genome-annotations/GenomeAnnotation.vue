<template>
  <DetailsSkeleton v-if="isLoading" />
  <div v-else>
    <div v-if="assembly">
      <DetailsHeader v-if="details" :details="details" />
      <VaTabs v-model="tab">
        <template #tabs>
          <VaTab :label="t('tabs.metadata')" name="metadata"></VaTab>
          <VaTab :label="t('tabs.jbrowse')"
            name="jbrowse"></VaTab>
        </template>
      </VaTabs>
      <div v-if="tab === 'jbrowse'" class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <Jbrowse2 :assembly="assembly" :annotations="annotations" />
        </div>
      </div>
      <div v-else class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <MetadataTreeCard :metadata="Object.entries(assembly.metadata)" />
        </div>
      </div>
    </div>
    <div v-else-if="errorMessage">
      <VaAlert color="danger" class="mb-6">
        {{ errorMessage || "Something happened!" }}
      </VaAlert>
    </div>
  </div>
</template>
<script setup lang="ts">
import AssemblyService from '../../services/clients/AssemblyService'
import { ref, watchEffect } from 'vue'
import Jbrowse2 from '../../components/genome-browser/Jbrowse2.vue'
import { Assembly, Details, TrackData } from '../../data/types'
import AnnotationService from '../../services/clients/AnnotationService'
import { useI18n } from 'vue-i18n'
import DetailsHeader from '../../components/common/DetailsHeader.vue'
import MetadataTreeCard from '../../components/ui/MetadataTreeCard.vue'
import DetailsSkeleton from '../common/components/DetailsSkeleton.vue'
import { AxiosError } from 'axios'

const { t } = useI18n()

const tab = ref('metadata')
const props = defineProps<{
  name: string
}>()
const isLoading = ref(true)
const errorMessage = ref<string | any>(null)

const details = ref<
  Details | any
>()
const assembly = ref<Assembly>()
const annotations = ref<TrackData[]>([])


watchEffect(async () => {
  await getData(props.name)
})


async function getData(name: string) {
  try {
    isLoading.value = true
    errorMessage.value = null
    const { data } = await AnnotationService.getAnnotation(name)
    details.value = { ...parseDetails(data) }
    annotations.value.push(data)
    await getRelatedAssembly(data.assembly_accession)
  } catch (e) {
    const axiosError = e as AxiosError
    if (axiosError.code === "404") {
      errorMessage.value = name + " Not Found"
    } else {
      errorMessage.value = axiosError.message
    }
  } finally {
    isLoading.value = false
  }
}


async function getRelatedAssembly(accession: string) {
  const { data } = await AssemblyService.getAssembly(accession)
  assembly.value = { ...data }
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