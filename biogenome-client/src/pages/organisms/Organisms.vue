<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item active :to="{ name: 'organisms' }" :label="t('organismDetails.breadcrumb')" />
  </va-breadcrumbs>
  <va-divider />
  <InfoBlockVue v-if="charts.length" :charts="charts" />
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <FilterForm :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
      <va-divider />
      <va-card-content>
        <div class="row align-center justify-end">
          <div class="flex">{{ t('table.total') }} {{ total }}</div>
          <div class="flex">
            <va-pagination v-model="offset" :page-size="organismStore.pagination.limit" :total="total" :visible-pages="3"
              buttons-preset="secondary" rounded gapped border-color="primary" @update:model-value="handlePagination" />
          </div>
        </div>
      </va-card-content>
      <va-skeleton v-if="isLoading" height="400px">
      </va-skeleton>
      <va-card-content v-else-if="errorMessage">
        {{ errorMessage }}
      </va-card-content>
      <va-card-content v-else>
        <va-list spaced>
          <va-list-item v-for="(organism, index) in organisms" :key="index" class="list__item"
            :to="{ name: 'organism', params: { taxid: organism.taxid } }">
            <va-list-item-section avatar>
              <va-avatar size="large">
                <img :src="organism.image" />
              </va-avatar>
            </va-list-item-section>
            <va-list-item-section>
              <va-list-item-label>
                <div class="row align-center">
                  <div class="flex">
                    {{ organism.scientific_name }}
                  </div>
                  <div v-if="showCountry" class="flex">
                    <div class="row">
                      <div v-for="country in organism.countries" :key="country" class="flex">
                        <va-icon :name="`flag-icon-${country.toLowerCase()} small`" color="warning" />
                      </div>
                    </div>
                  </div>
                </div>
              </va-list-item-label>
              <va-list-item-label v-if="organism.insdc_common_name" caption>
                {{ organism.insdc_common_name }}
              </va-list-item-label>
            </va-list-item-section>
            <va-list-item-section v-for="(f, i) in getOrganismRelatedData(organism)" :key="i" icon>
              <va-popover class="mr-2 mb-2" :message="f.key" :color="f.color">
                <va-icon :name="f.icon" :color="f.color" />
              </va-popover>
            </va-list-item-section>
          </va-list-item>
        </va-list>
      </va-card-content>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { showCountries } from '../../../config.json'
import { onMounted, ref } from 'vue'
import InfoBlockVue from '../../components/InfoBlock.vue'
import { tableFilters, relatedData } from './configs'
import { Filter, InfoBlock, OrganismSearchForm } from '../../data/types'
import OrganismService from '../../services/clients/OrganismService'
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow'
import { useOrganismStore } from '../../stores/organism-store'
import FilterForm from '../../components/ui/FilterForm.vue'
import { organismInfoBlock } from '../../../config.json'
import StatisticsService from '../../services/clients/StatisticsService'

const { t } = useI18n()
const charts = <InfoBlock[]>organismInfoBlock

const showCountry = ref(showCountries)
const filters = ref<Filter[]>(tableFilters)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const organismStore = useOrganismStore()
const offset = ref(1 + organismStore.pagination.offset)

const organisms = ref<Record<string, any>[]>([])
const total = ref(0)

onMounted(async () => {
  if (showCountry.value) await setCountries()
  await getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination })
})

function handleSubmit(payload: OrganismSearchForm) {
  organismStore.searchForm = { ...payload }
  if(payload.country && payload.country.value) organismStore.searchForm.country = payload.country.value
  organismStore.resetPagination()
  offset.value = 1
  getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination })
}
function handlePagination(value: number) {
  organismStore.pagination.offset = value - 1
  getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination })
}
function reset() {
  offset.value = 1
  organismStore.resetSearchForm()
  organismStore.resetPagination()
  getOrganisms({ ...organismStore.pagination })
}
async function getOrganisms(query: Record<string, any>) {
  try {
    const { data } = await OrganismService.getOrganisms(query)
    organisms.value = data.data
    total.value = data.total
  } catch (e) {
    errorMessage.value = 'Something happened'
  } finally {
    isLoading.value = false
  }
}

function getOrganismRelatedData(organism: Record<string, any>) {
  const models = relatedData.filter(
    (relatedModel) => Object.keys(organism).includes(relatedModel.key) && organism[relatedModel.key].length,
  )
  return models
}

async function setCountries() {
  if (filters.value.findIndex(f => f.key === 'country') !== -1) return
  try {
    isLoading.value = true
    const { data } = await StatisticsService.getModelFieldStats('organisms', { field: 'countries' })
    if (typeof data !== 'object' || !Object.keys(data).length) return
    const countries = am5geodata_worldLow.features
      .filter((f: Record<string, any>) => Object.keys(data).includes(f.properties.id))
      .map((f: Record<string, any>) => {
        return { text: f.properties.name, value: f.properties.id }
      })
    const newFilters = [...filters.value]
    newFilters.push({
      label: 'organismList.filters.searchCountry',
      key: 'country',
      type: 'select',
      options: countries,
    })
    filters.value = [...newFilters]
  } catch (e) {
    errorMessage.value = 'Something happened'
  } finally {
    isLoading.value = false
  }
}

</script>

<style scoped lang="scss">
@import 'flag-icons/css/flag-icons.css';

.list__item:hover {
  box-shadow: rgba(0, 0, 0, 0.12) 11px 17px 10px 0px;
}

.chart {
  height: 400px;
}

.row-equal .flex {
  .va-card {
    height: 100%;
  }
}

.list__item+.list__item {
  margin-top: 20px;
}
</style>
