<template>
  <va-card class="fill-height">
    <va-form>
      <va-card-content>
        <div class="row align-center justify-start">
          <div v-for="(filter, index) in filters" :key="index" class="flex lg4 md4 sm12 xs12">
            <div v-if="filter.type === 'input'">
              <va-input v-model="searchForm[filter.key]" :label="t(filter.label)" />
            </div>
            <div v-else>
              <va-select v-model="searchForm[filter.key]" :label="t(filter.label)" :options="filter.options" />
            </div>
          </div>
        </div>
      </va-card-content>
      <va-card-actions align="between">
        <va-button @click="handleSubmit()">{{ t('buttons.submit') }}</va-button>
        <va-button color="danger" @click="reset()">{{ t('buttons.reset') }}</va-button>
      </va-card-actions>
    </va-form>
    <va-card-content>
      <p>{{ t('table.total') }} {{ total }}</p>
      <DataTable :items="organisms" :columns="columns" />
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
  </va-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Filter } from '../../data/types'
import OrganismService from '../../services/clients/OrganismService'
import {onMounted, ref} from 'vue'
import DataTable from '../../components/ui/DataTable.vue'

const { t } = useI18n()

const props = defineProps<{
    taxid:string
}>()

const initPagination = {
  offset: 0,
  limit: 10,
}
const initSearchForm = {
  insdc_status: '',
  parent_taxid: props.taxid,
  filter: '',
  filter_option: '',
}
const offset = ref(1)
const total = ref(0)
const searchForm = ref({ ...initSearchForm })
const pagination = ref({ ...initPagination })
const organisms = ref([])

onMounted(async ()=>{
    await handleSubmit()
})

const filters: Filter[] = [
  {
    label: 'organismList.filters.searchInput',
    key: 'filter',
    type: 'input',
  },
  {
    label: 'organismList.filters.searchSelect',
    key: 'filter_option',
    type: 'select',
    options: ['taxid', 'common_name', 'scientific_name', 'tolid'],
  },
  {
    label: 'organismList.filters.insdcStatus',
    key: 'insdc_status',
    type: 'select',
    options: [
      'Sample Acquired',
      'Biosample Submitted',
      'Reads Submitted',
      'Assemblies Submitted',
      'Annotations Created',
    ],
  },
]
const columns = ['scientific_name', 'tolid_prefix', 'insdc_status']


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

