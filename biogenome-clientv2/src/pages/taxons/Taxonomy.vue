<template>
  <va-accordion v-model="value">
    <va-collapse v-for="(rank, index) in ranks" :key="index" text-color="textPrimary" color="#f6f6f6" flat>
      <template #header-content>
        <div class="row align-center">
          <div class="flex va-h6">
            {{ rank }}
          </div>
          <div class="flex">
            <va-chip size="small">{{ taxonRanks[rank] }}</va-chip>
          </div>
        </div>
      </template>
      <va-card>
        <va-card-content>
          <div class="row justify-space-between align-center">
            <div class="flex">
              <va-input v-model="filter" placeholder="Search by name" label="search taxon">
                <template #append-inner>
                  <va-button color="danger" type="reset" @click="filter = ''">Reset</va-button>
                </template>
              </va-input>
            </div>
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
        <va-card-content>
          <va-data-table
            sticky-header
            height="180px"
            :columns="['name', 'taxid', 'rank', 'leaves', 'actions']"
            :items="taxons"
          >
            <template #header(leaves)>Organisms</template>
            <template #cell(actions)="{ rowData }"
              ><va-chip v-if="rowData.leaves" size="small" @click="$emit('generateTree', rowData.taxid)"
                >generate tree</va-chip
              >
              <va-chip size="small" @click="toOrganisms(rowData)">see organisms</va-chip>
            </template>
            <template #cell(leaves)="{ rowData }"
              ><p v-if="rowData.leaves">{{ rowData.leaves }}</p>
            </template>
          </va-data-table>
        </va-card-content>
      </va-card>
    </va-collapse>
  </va-accordion>
</template>
<script setup lang="ts">
  import TaxonService from '../../services/clients/TaxonService'
  import { ref, onMounted, watch } from 'vue'
  import StatisticsService from '../../services/clients/StatisticsService'
  import { useOrganismStore } from '../../stores/organism-store'
  import { useRouter } from 'vue-router'
  
  const orgStore = useOrganismStore()

  const router = useRouter()

  const emits = defineEmits(['generateTree'])

  const value = ref([false, false, false, false, false, false, false])

  const ranks = ['superkingdom', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']

  const colors = ['#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec', '#c099b5', '#96ad9b', '#cf7e82']

  const taxonRanks = ref({})

  const taxons = ref([])

  const total = ref(0)
  const initPagination = {
    offset: 0,
    limit: 20,
  }

  const filter = ref('')
  const index = ref(-1)
  const pagination = ref({ ...initPagination })
  const initOffset = 1 + pagination.value.offset
  const offset = ref(initOffset)

  async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    getTaxons()
  }

  watch(filter, async () => {
    pagination.value = { ...initPagination }
    offset.value = initOffset
    getTaxons()
  })

  watch(value, async () => {
    index.value = value.value.findIndex((v) => v)
    if (index.value === -1) return
    pagination.value = { ...initPagination }
    offset.value = initOffset
    getTaxons()
  })
  onMounted(async () => {
    const { data } = await StatisticsService.getModelFieldStats('taxons', { field: 'rank' })
    taxonRanks.value = { ...data }
  })

  async function getTaxons() {
    const params = { ...pagination.value, rank: ranks[index.value] }
    if (filter.value.length >= 3) {
      params.filter = filter.value
    }
    const { data } = await TaxonService.getTaxons({ ...params })
    taxons.value = [...data.data]
    total.value = data.total
  }

  function toOrganisms(data: object) {
    if (data.leaves) {
      orgStore.searchForm.parent_taxid = data.taxid
      router.push({ name: 'organism-list' })
    } else {
      router.push({ name: 'organism', params: { taxid: data.taxid } })
    }
  }
</script>
