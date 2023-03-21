<template>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'taxons' }" label="taxonomy" />
      <va-breadcrumbs-item
        v-if="router.currentRoute.value.name === 'taxon'"
        active
        :label="router.currentRoute.value.params.taxid"
      />
    </va-breadcrumbs>
    <va-divider />
    <div id="top-container" v-if="showData">
      <div class="row row-equal justify-space-between">
        <div class="flex">
          <h1 class="va-h1">{{ taxon.name }}</h1>
          <p>{{ taxon.rank }}</p>
        </div>
        <div class="flex">
          <div class="row row-equal align-center">
            <div class="flex">
                <a target="_blank" :href="`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${taxon.taxid}`">
                <va-avatar size="large">
                  <img :src="'/ncbi.png'" />
                </va-avatar>
              </a>
            </div>
            <div class="flex">
              <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${taxon.taxid}`">
                <va-avatar size="large">
                  <img :src="'/ena.jpeg'" />
                </va-avatar>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="row row-equal">
        <div :key="counter"
            class="flex lg6 md6 sm12 xs12">
          <Suspense>
              <PieChart
                  :field="'insdc_status'"
                  :model="'organisms'"
                  :title="'INSDC Status'"
                  :label="'INSDC Status'"
                  :query="{taxon_lineage:props.taxid}"
              />
          </Suspense>
        </div>
        <div v-if="children.length" class="flex lg6 md6 sm12 xs12">
          <va-card  class="fill-height">
            <va-tabs v-model="treeType" grow>
              <template #tabs>
                <va-tab
                  v-for="tab in ['Radial Tree', 'Indented Tree']"
                  :key="tab"
                  :name="tab"
                >
                  {{ tab }}
                </va-tab>
              </template>
            </va-tabs>
              <va-card-content style="max-height: 500px;overflow: scroll;" v-if="showTree">
                <div v-if="treeType === 'Radial Tree'">
                  <TreeOfLife :data="treeData"/>
                </div>
                <div v-else>
                  <IndentedTree :data="treeData"/>

                </div>
                <!-- <va-list>
                  <va-list-label>Related Taxons</va-list-label>
                  <va-list-item v-for="(bp, index) in children" :key="index" class="list__item" :to="{name:'taxon', params:{taxid:bp.taxid}}">
                      <va-list-item-section>
                        <va-list-item-label>
                            {{ bp.name }}
                        </va-list-item-label>

                        <va-list-item-label caption>
                            {{ bp.rank }}
                        </va-list-item-label>
                      </va-list-item-section>
                  </va-list-item>
                </va-list> -->
              </va-card-content>
          </va-card>
        </div>
        <div
          v-if="coordinates.length"
          class="flex lg6 md6 sm12 xs12"
        >
          <LeafletMap 
              :key="counter"
              style="height: 100%;" :coordinates="coordinates"/>
        </div>
        <div class="flex lg6 md6 sm12 xs12">
          <va-card class="fill-height">
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
              <p>Total: {{ total }}</p>
              <DataTable :items="organisms" :columns="columns"/>
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
        </div>
      </div>
    </div>
    <div v-else-if="error">
      <h3 class="va-h3">
        {{ error }}
      </h3>
    </div>
  </template>
  <script setup lang="ts">
    import { onMounted, ref, watch } from 'vue'
    import { AxiosResponse } from 'axios'
    import LeafletMap from '../../components/maps/LeafletMap.vue'
    import { useRouter } from 'vue-router'
    import PieChart from '../../components/charts/PieChart.vue'
    import { Filter } from '../../data/types'
    import OrganismService from '../../services/clients/OrganismService'
    import DataTable from '../../components/ui/DataTable.vue'
    import TaxonService from '../../services/clients/TaxonService'
    import IndentedTree from '../organisms/IndentedTree.vue'
    import TreeOfLife from '../../components/TreeOfLife.vue'


    const treeType = ref('Radial Tree')
    const types = ref(['Radial Tree', 'Indented Tree'])
    const counter = ref(0)

    const filters: Filter[] = [
    {
      label: 'search organism',
      placeholder: 'Search by species, taxid, common_name or tolid',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'filter by',
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'common_name', 'scientific_name', 'tolid'],
    },
    {
      label: 'INSDC status',
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

    const router = useRouter()
    const showData = ref(false)
    const error = ref('')
    const props = defineProps({
      taxid: String,
    })
    const coordinates = ref([])
    const children = ref([])
    const organisms = ref([])

    watch(
      () => props.taxid,
      async (value) => {
        initSearchForm.parent_taxid = value
        await getTaxonInfo(value)
      }
    )
    const taxon = ref({})
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

  const treeData = ref({})
  const showTree = ref(false)
    onMounted(async () => {
        await getTaxonInfo(props.taxid)
    })
  
    function getTaxon({ data }: AxiosResponse) {
      taxon.value = { ...data }

    }
    function getChildren({data}: AxiosResponse){
        children.value = [...data]
    }
    function getCoordinates({ data }: AxiosResponse) {
        coordinates.value = []
        data.forEach(organism => {
            organism.locations.forEach(location => {
                const lng = location[0]
                const lat = location[1]
                const value = {
                    latitude: Number(lat),
                    longitude: Number(lng),
                    id: organism.scientific_name,
                    taxid: organism.taxid
                }
                if(organism.image){
                    value.image = organism.image
                }
                coordinates.value.push(value)
            })
        })
        counter.value++
    }
    async function getTaxonInfo(taxid:string) {
        window.scrollBy({top:0})
        try {
            getTaxon(await TaxonService.getTaxon(taxid))
            getCoordinates(await TaxonService.getTaxonCoordinates(taxid))
            getChildren(await TaxonService.getTaxonChildren(taxid))
            searchForm.value = {...initSearchForm}
            pagination.value = {...initPagination}
            const { data } = await OrganismService.getOrganisms({ ...searchForm.value, ...pagination.value })
            organisms.value = [...data.data]
            total.value = data.total
            showData.value = true
            const tree = (await TaxonService.getTree(props.taxid)).data
            treeData.value = {...tree}
            showTree.value = true
            if(Number(taxon.value.leaves) >= 200){
              types.value = ['Indented Tree']
              treeType.value = types.value[0]
            }
        } catch (e) {
            if(e && e.response && e.response.data) error.value = taxid + ' ' + e.response.data.message
            showData.value = false
      }
    }
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
  