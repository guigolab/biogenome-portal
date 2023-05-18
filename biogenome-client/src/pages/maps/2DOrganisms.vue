<template>
  <div>
    <p class="va-title">{{ t('menu.organismsMap') }}</p>
    <va-divider />
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-card-content v-if="coordinates.length">
          <div style="height: 100vh" class="row row-equal">
            <div class="flex lg12 md12 sm12 xs12">
              <LeafletMap :coordinates="coordinates" />
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
import TaxonService from '../../services/clients/TaxonService'
const { t } = useI18n()
const root = import.meta.env.VITE_ROOT_NODE
const coordinates = ref([])

onMounted(async () => {
  getCoordinates(await TaxonService.getTaxonCoordinates(root))
})
function getCoordinates({ data }: AxiosResponse) {
  coordinates.value = []
  data.forEach((organism) => {
    organism.locations.forEach((location) => {
      const lng = location[0]
      const lat = location[1]
      const value = {
        latitude: Number(lat),
        longitude: Number(lng),
        id: organism.scientific_name,
        taxid: organism.taxid,
      }
      if (organism.image) {
        value.image = organism.image
      }
      coordinates.value.push(value)
    })
  })
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

.list__item+.list__item {
  margin-top: 10px;
}
</style>
