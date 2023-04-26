<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item :to="{ name: 'reads' }" label="experiments" />
    <va-breadcrumbs-item
      v-if="router.currentRoute.value.name === 'read'"
      active
      :label="router.currentRoute.value.params.accession"
    />
  </va-breadcrumbs>
  <va-divider />
  <div v-if="read.metadata">
    <div class="row row-equal justify-space-between">
      <div class="flex">
        <h1 class="va-h1">{{ read.metadata.experiment_title }}</h1>
        <div class="row">
          <div class="flex">
            <va-button :to="{ name: 'organism', params: { taxid: read.taxid } }" preset="primary" icon="pets">{{
              read.metadata.scientific_name
            }}</va-button>
          </div>
          <div class="flex">
            <va-button
              :to="{ name: 'biosample', params: { accession: read.metadata.sample_accession } }"
              preset="primary"
              icon="hub"
              >{{ read.metadata.sample_accession }}</va-button
            >
          </div>
        </div>
      </div>
      <div class="flex">
        <div class="row row-equal align-center">
          <div class="flex">
            <a target="_blank" :href="`https://www.ncbi.nlm.nih.gov/sra/${read.experiment_accession}`">
              <va-avatar size="large">
                <img :src="'/ncbi.png'" />
              </va-avatar>
            </a>
          </div>
          <div class="flex">
            <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${read.experiment_accession}`">
              <va-avatar size="large">
                <img :src="'/ena.jpeg'" />
              </va-avatar>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="row row-equal">
      <div class="flex">
        <va-card class="mb-4" color="danger">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ read.instrument_platform }}</h2>
            <p style="color: white">{{ t('experimentDetails.instrumentPlatform') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div class="flex">
        <va-card class="mb-4" color="info">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ read.instrument_model }}</h2>
            <p style="color: white">{{ t('experimentDetails.instrumentModel') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div class="flex">
        <va-card class="mb-4" color="secondart">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ read.metadata.base_count }}</h2>
            <p style="color: white">{{ t('experimentDetails.baseCount') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div class="flex">
        <va-card class="mb-4" color="warning">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ read.metadata.center_name }}</h2>
            <p style="color: white">{{ t('experimentDetails.centerName') }}</p>
          </va-card-content>
        </va-card>
      </div>
      <div class="flex">
        <va-card class="mb-4" color="secondary">
          <va-card-content>
            <h2 class="va-h4 ma-0" style="color: white">{{ read.metadata.first_created }}</h2>
            <p style="color: white">{{ t('experimentDetails.firstCreated') }}</p>
          </va-card-content>
        </va-card>
      </div>
    </div>
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-card-title>{{ t('uiComponents.metadata') }}</va-card-title>
        <va-card-content>
          <Metadata :metadata="read.metadata" />
        </va-card-content>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import ReadService from '../../services/clients/ReadService'
  import { onMounted, ref } from 'vue'
  import { AxiosResponse } from 'axios'
  import Metadata from '../../components/ui/Metadata.vue'
  import { useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const router = useRouter()
  const props = defineProps({
    accession: String,
  })

  const read = ref({})

  onMounted(async () => {
    getRead(await ReadService.getRead(props.accession))
  })

  function getRead({ data }: AxiosResponse) {
    read.value = { ...data }
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

  .list__item + .list__item {
    margin-top: 10px;
  }
</style>
