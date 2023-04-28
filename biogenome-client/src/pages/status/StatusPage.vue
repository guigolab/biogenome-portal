<template>
  <div>
  <p class="va-title">{{t('statusList.breadcrumb')}}</p>
  <va-divider />
  <div class="row row-equal">
    <div class="flex lg6 md6 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'goat_status'"
          :model="'organisms'"
          :title="'statusList.charts.firstPiechart'"
          :label="'statusList.charts.firstPiechart'"
        />
      </Suspense>
      </div>
      <div class="flex lg6 md6 sm12 xs12">
      <Suspense>
        <PieChart
          :field="'target_list_status'"
          :model="'organisms'"
          :title="'statusList.charts.secondPiechart'"
          :label="'statusList.charts.secondPiechart'"
        />
      </Suspense>
    </div>
  </div>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card>
        <va-card-content>
          <div class="row align-center justify-space-between">
            <div class="flex">{{t('table.total')}}: {{ total }}</div>
            <div class="flex">
              <va-button preset="secondary" @click="downloadReport()" icon="fa-download"></va-button>
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
                      v-model="statusStore.searchForm[filter.key]"
                      :label="filter.label"
                    />
                  </div>
                  <div v-else>
                    <va-select v-model="statusStore.searchForm[filter.key]" :label="filter.label" :options="filter.options" />
                  </div>
                </div>
              </div>
            </va-card-content>
            <va-card-actions align="between">
              <va-button @click="handleSubmit()">{{ t('buttons.submit') }}</va-button>
              <va-button color="danger" @click="reset()">{{t('buttons.reset')}}</va-button>
            </va-card-actions>
          </va-form>
          <va-card-content>
            <DataTable :items="organisms" :columns="columns"/>
            <div class="row align-center justify-center">
              <div class="flex">
                <va-pagination
                  v-model="offset"
                  :page-size="statusStore.pagination.limit"
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
</div>
</template>
<script setup lang="ts">
  import DataTable from '../../components/ui/DataTable.vue'
  import { onMounted, ref } from 'vue'
  import { Filter } from '../../data/types'
  import { useStatusStore } from '../../stores/status-store'
  import OrganismService from '../../services/clients/OrganismService'
  import PieChart from '../../components/charts/PieChart.vue'
  import GoaTService from '../../services/clients/GoaTService'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const statusStore = useStatusStore()

  const offset = ref(1)
  const total = ref(0)

  const organisms = ref([])



  onMounted(async () => {
    const {data} = await OrganismService.getOrganisms({...statusStore.searchForm, ...statusStore.pagination})
    organisms.value = [...data.data]
    total.value = data.total
  })

  const filters: Filter[] = [
    {
      label: t('statusList.filters.searchInput'),
      key: 'filter',
      type: 'input',
    },
    {
      label: t('statusList.filters.filterBy'),
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'common_name', 'scientific_name', 'tolid'],
    },
    {
      label: t('statusList.filters.goatStatus'),
      key: 'goat_status',
      type: 'select',
      options: [
        'Sample Collected',
        'Sample Acquired',
        'Data Generation',
        'In Assembly',
        'INSDC Submitted',
        'Publication Available',
      ],
    },
    {
      label: t('statusList.filters.targetListStatus'),
      key: 'target_list_status',
      type: 'select',
      options: ['long_list', 'family_representative', 'other_priority'],
    },
  ]

  const columns = ['scientific_name','insdc_common_name', 'tolid_prefix', 'goat_status', 'target_list_status']

  async function handleSubmit() {
    offset.value = 1
    const { data } = await OrganismService.getOrganisms({ ...statusStore.searchForm, ...statusStore.pagination })
    statusStore.resetPagination()
    organisms.value = [...data.data]
    total.value = data.total
  }

  async function reset() {
    offset.value = 1
    statusStore.resetPagination()
    statusStore.resetSearchForm()
    const { data } = await OrganismService.getOrganisms({ ...statusStore.searchForm, ...statusStore.pagination })
    organisms.value = [...data.data]
    total.value = data.total
  }

  async function handlePagination(value: number) {
    statusStore.pagination.offset = value -1
    const { data } = await OrganismService.getOrganisms({ ...statusStore.searchForm, ...statusStore.pagination })
    organisms.value = [...data.data]
    total.value = data.total
  }

  async function downloadReport() {
    const response = await GoaTService.getGoatReport({download:true, ...statusStore.searchForm})
    console.log(response)
    const data = response.data
    const href = URL.createObjectURL(data);

// create "a" HTML element with href to file & click
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', 'file.tsv'); //or any other extension
    document.body.appendChild(link);
    link.click();

    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
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
  .selected::before {
    background-color: var(--va-primary);
    opacity: var(--va-tree-node-interactive-bg-opacity);
    content: '';
    background-color: var(--va-primary);
    border-radius: var(--va-tree-node-border-radius);
    bottom: 0;
    left: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
  }
</style>
