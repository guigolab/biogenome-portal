<template>
  <div>
    <p class="va-title">{{ t('menu.organismsMap') }}</p>
    <va-divider />
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-card-content>
          <div style="height: 100vh" class="row row-equal">
            <div class="flex lg12 md12 sm12 xs12">
              <va-skeleton height="90vh" v-if="isLoading"></va-skeleton>
              <div v-else-if="isError">
                <p>{{ errorMessage }}</p>
              </div>
              <LeafletMap v-else :coordinates="coordinates" />
            </div>
          </div>
        </va-card-content>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { AxiosResponse } from 'axios'
import { onMounted, ref } from 'vue'
import LeafletMap from '../../components/maps/LeafletMap.vue'
import { useI18n } from 'vue-i18n'
import GeoLocationService from '../../services/clients/GeoLocationService'
import { SampleLocations } from '../../data/types'

const { t } = useI18n()
const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'
const coordinates = ref<SampleLocations[]>([])
const isLoading = ref(false)
const isError = ref(false)
const errorMessage = ref('')
onMounted(async () => {
  try {
    isLoading.value = true
    const { data } = await GeoLocationService.getLocationsByTaxon(rootNode)
    coordinates.value = [...data]
  } catch(e) {
    isError.value = true
    errorMessage.value = 'Error fetching data'
  } finally {
    isLoading.value = false
  }
})

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

.list__item+.list__item {
  margin-top: 10px;
}
</style>
