<template>
  <va-card-content>
    <div class="row align-center justify-space-between">
      <div class="flex">
        <va-form tag="form" @submit.prevent="handleSubmit">
          <div class="row align-center">
            <div class="flex">
              <va-input v-model="organismStore.searchForm.filter" :label="t('organismList.filters.searchInput')" />
            </div>
            <div class="flex">
              <va-select
                v-model="organismStore.searchForm.filter_option"
                :label="t('organismList.filters.searchSelect')"
                :options="['taxid', 'common_name', 'scientific_name', 'tolid']"
              />
            </div>
            <div v-if="countries.length" class="flex">
              <va-select
                v-model="organismStore.searchForm.country"
                :label="t('organismList.filters.searchCountry')"
                :options="countries"
                searchable
                value-by="value"
              >
              </va-select>
            </div>
            <va-card-actions>
              <va-button type="submit">{{ t('buttons.submit') }}</va-button>
              <va-button color="danger" @click="reset()">{{t('buttons.reset')}}</va-button>
            </va-card-actions>
          </div>
        </va-form>
      </div>
      <div class="flex">
        <div class="row align-center">
          <div class="flex">
            <va-button icon="list" :preset="listView ? 'primary' : 'secondary'" @click="listView = true" />
          </div>
          <div class="flex">
            <va-button icon="grid_view" :preset="listView ? 'secondary' : 'primary'" @click="listView = false" />
          </div>
        </div>
      </div>
    </div>
  </va-card-content>
  <va-card-content>
    <div class="row align-center justify-space-between">
      <div class="flex">{{t('table.total')}} {{ total }}</div>
      <div class="flex">
        <va-pagination
          v-model="offset"
          :page-size="organismStore.pagination.limit"
          :total="total"
          :visible-pages="3"
          buttons-preset="secondary"
          rounded
          gapped
          border-color="primary"
          @update:model-value="handlePagination"
        />
      </div>
    </div>
  </va-card-content>
  <va-card-content v-if="listView">
    <va-list spaced>
      <va-list-item
        v-for="(organism, index) in organisms"
        :key="index"
        class="list__item"
        :to="{ name: 'organism', params: { taxid: organism.taxid } }"
      >
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
              <div v-if="organism.countries && organism.countries.length" class="flex">
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
          <va-list-item-label> </va-list-item-label>
        </va-list-item-section>
        <va-list-item-section v-if="organism.biosamples.length" icon>
          <va-icon name="fa-vial" color="background-tertiary" />
        </va-list-item-section>
        <va-list-item-section v-if="organism.assemblies.length" icon>
          <va-icon name="fa-dna" color="background-tertiary" />
        </va-list-item-section>
        <va-list-item-section v-if="organism.experiments.length" icon>
          <va-icon name="fa-file-lines" color="background-tertiary" />
        </va-list-item-section>
      </va-list-item>
    </va-list>
  </va-card-content>
  <va-card-content v-else>
    <div class="row row-equal">
      <div v-for="(org, index) in organisms" :key="index" class="flex md4 lg4">
        <va-card :to="{ name: 'organism', params: { taxid: org.taxid } }">
          <va-card-block class="flex-nowrap" horizontal>
            <va-image v-if="org.image" style="flex: 0 0 200px" :src="org.image" />
            <div style="flex: auto">
              <va-card-content>
                <div class="row align-center">
                  <div class="flex va-h6">
                    {{ org.scientific_name }}
                  </div>
                  <div v-if="org.countries && org.countries.length" class="flex">
                    <div class="row">
                      <div v-for="country in org.countries" :key="country" class="flex">
                        <va-icon :name="`flag-icon-${country.toLowerCase()} small`"></va-icon>
                      </div>
                    </div>
                  </div>
                </div>
                <p v-if="org.insdc_common_name" class="va-text-secondary">{{ org.insdc_common_name }}</p>
              </va-card-content>
              <va-card-content>
                <va-button size="small">{{t('buttons.view')}}</va-button>
              </va-card-content>
            </div>
            <va-card-actions v-if="hasINSDCData(org)" vertical align="between" style="flex: 0 auto; padding: 0px">
              <va-button v-if="org.assemblies.length" icon="fa-dna" plain />
              <va-button v-if="org.biosamples.length" icon="fa-vial" plain />
              <va-button v-if="org.experiments.length" icon="fa-file-lines" plain />
            </va-card-actions>
          </va-card-block>
        </va-card>
      </div>
    </div>
  </va-card-content>
</template>
<script setup lang="ts">
  import OrganismService from '../../services/clients/OrganismService'
  import { onMounted, ref } from 'vue'
  import { AxiosResponse } from 'axios'
  import { useOrganismStore } from '../../stores/organism-store'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const listView = ref(true)

  const organismStore = useOrganismStore()

  const offset = ref(1 + organismStore.pagination.offset)

  const organisms = ref([])
  const total = ref(0)

  const countries = ref([])

  onMounted(async () => {
    getOrganisms(await OrganismService.getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination }))
  })

  function hasINSDCData(org) {
    return org.biosamples.length || org.experiments.length || org.assemblies.length
  }
  async function handleSubmit() {
    organismStore.resetPagination()
    offset.value = 1
    getOrganisms(await OrganismService.getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination }))
  }

  async function handlePagination(value: number) {
    organismStore.pagination.offset = value - 1
    getOrganisms(await OrganismService.getOrganisms({ ...organismStore.searchForm, ...organismStore.pagination }))
  }

  async function reset() {
    offset.value = 1
    organismStore.resetSearchForm()
    organismStore.resetPagination()
    getOrganisms(await OrganismService.getOrganisms({ ...organismStore.pagination }))
  }

  function getOrganisms({ data }: AxiosResponse) {
    organisms.value = data.data
    total.value = data.total
    return data
  }
</script>
<style lang="scss" scoped>
  @import 'flag-icons/css/flag-icons.css';

  .list__item + .list__item {
    margin-top: 20px;
  }
</style>
