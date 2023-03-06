<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <Suspense>
        <PieChart
          :key="selectedStatusModel.id"
          :field="selectedStatusModel.id"
          :model="'organisms'"
          :title="selectedStatusModel.label"
          :label="selectedStatusModel.label"
          :query="{ taxon_lineage: taxid }"
        />
      </Suspense>
    </div>
    <div class="flex lg9 md9 sm12 xs12">
      <va-card>
        <va-card-content>
          <div class="row align-center justify-space-between">
            <div class="flex">Total: {{ total }}</div>
            <div class="flex">
              <va-button preset="secondary" icon="fa-download"></va-button>
            </div>
          </div>
        </va-card-content>
        <va-card-content>
          <va-form>
            <va-card-content>
              <div class="row align-center justify-start">
                <div v-for="(filter, index) in filters" :key="index" class="flex lg4 md4 sm12 xs12">
                  <div v-if="filter.type === 'input'">
                    <va-input
                      v-model="searchForm[filter.key]"
                      :label="filter.label"
                      :placeholder="filter.placeholder"
                    />
                  </div>
                  <div v-else>
                    <va-select v-model="searchForm[filter.key]" :label="filter.label" :options="filter.options" />
                  </div>
                </div>
              </div>
            </va-card-content>
            <va-card-actions align="between">
              <va-button @click="handleSubmit()">Search</va-button>
              <va-button color="danger" @click="reset()">Reset</va-button>
            </va-card-actions>
          </va-form>
          <va-card-content>
            <va-data-table :items="organisms" :columns="columns" />
            <div class="row align-center justify-center">
              <div class="flex">
                <va-pagination
                  v-model="offset"
                  :page-size="pagination.limit"
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
        </va-card-content>
      </va-card>
    </div>
  </div>
</template>
<script setup lang="ts">
  import PieChart from '../../components/charts/PieChart.vue'
  import { useStatusStore } from '../../stores/status-store'
  import OrganismService from '../../services/clients/OrganismService'
  import { onMounted, ref } from 'vue'

  const statusStore = useStatusStore()
  const props = defineProps({
    taxid: String,
    filters: Array,
    columns: Array,
    selectedStatusModel: Object,
  })

  const initPagination = {
    offset: 0,
    limit: 10,
  }
  const initSearchForm = {
    insdc_status: '',
    goat_status: '',
    parent_taxid: props.taxid,
    target_list_status: '',
    filter: '',
    filter_option: '',
  }

  const offset = ref(1)
  const total = ref(0)
  const searchForm = ref({ ...initSearchForm })
  const pagination = ref({ ...initPagination })

  const organisms = ref([])

  onMounted(async () => {
    const { data } = await OrganismService.getOrganisms({ ...searchForm.value, ...pagination.value })
    organisms.value = [...data.data]
    total.value = data.total
  })
  async function handleSubmit() {
    pagination.value = { ...initPagination }
    offset.value = 1
    const { data } = await OrganismService.getOrganisms({ ...searchForm.value, ...pagination.value })
    organisms.value = [...data.data]
    total.value = data.total
  }

  async function reset() {
    offset.value = 1
    searchForm.value = { ...initSearchForm }
    pagination.value = { ...initPagination }
    const { data } = await OrganismService.getOrganisms({ ...searchForm.value, ...pagination.value })
    organisms.value = [...data.data]
    total.value = data.total
  }

  async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    const { data } = await OrganismService.getOrganisms({ ...searchForm.value, ...pagination.value })
    organisms.value = [...data.data]
    total.value = data.total
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
</style>
