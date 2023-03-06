<template>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'bioprojects' }" label="bioprojects" />
      <va-breadcrumbs-item
        v-if="router.currentRoute.value.name === 'bioproject'"
        active
        :label="router.currentRoute.value.params.accession"
      />
    </va-breadcrumbs>
    <va-divider />
    <div id="top-container" v-if="showData">
      <div class="row row-equal justify-space-between">
        <div class="flex">
          <h1 class="va-h1">{{ bioproject.title }}</h1>
          <p>{{ bioproject.accession }}</p>
        </div>
        <div class="flex">
          <div class="row row-equal align-center">
            <div class="flex">
              <a target="_blank" :href="`https://www.ncbi.nlm.nih.gov/bioproject/${bioproject.accession}`">
                <va-avatar size="large">
                  <img :src="'/ncbi.png'" />
                </va-avatar>
              </a>
            </div>
            <div class="flex">
              <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${bioproject.accession}`">
                <va-avatar size="large">
                  <img :src="'/ena.jpeg'" />
                </va-avatar>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="row row-equal">
        <div  :key="counter"
            class="flex lg3 md4 sm12 xs12">
        <Suspense>
            <PieChart
                :field="'insdc_status'"
                :model="'organisms'"
                :title="'INSDC Status'"
                :label="'INSDC Status'"
                :query="{bioprojects:props.accession}"
            />
        </Suspense>
        </div>
        <div
          v-if="coordinates.length"
          class="flex lg9 md8 sm12 xs12"
        >
            <LeafletMap 
                :key="counter"
                style="height: 500px;" :coordinates="coordinates"/>
        </div>
        <div :class=" coordinates.length?'flex lg12 md12 sm12 xs12':'flex lg9 md8 sm12 xs12'">
            <div class="row row-equal">
                <div :class="bioproject.children.length? 'flex lg6 md6 sm12 xs12':'flex lg12 md12 sm12 xs12'">
                    <va-card class="fill-height">
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
                    <p>Total: {{ total }}</p>
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
                    </va-card>
                </div>
                <div v-if="bioproject.children.length" class="flex lg6 md6 sm12 xs12">
                    <va-card class="fill-height">
                        <va-card-content>
                    <va-list>
                        <va-list-label>Related BioProjects</va-list-label>
                        <va-list-item v-for="(bp, index) in children" :key="index" class="list__item" :to="{name:'bioproject', params:{accession:bp.accession}}">
                            <va-list-item-section>
                            <va-list-item-label>
                                {{ bp.title }}
                            </va-list-item-label>

                            <va-list-item-label caption>
                                {{ bp.accession }}
                            </va-list-item-label>
                            </va-list-item-section>
                        </va-list-item>
                    </va-list>
                </va-card-content>
                    </va-card>
                </div>
            </div>
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
    import { onMounted, ref, watch, computed } from 'vue'
    import { AxiosResponse } from 'axios'
    import LeafletMap from '../../components/maps/LeafletMap.vue'
    import { useRouter } from 'vue-router'
    import BioProjectService from '../../services/clients/BioProjectService'
    import PieChart from '../../components/charts/PieChart.vue'
    import { Filter } from '../../data/types'
    import OrganismService from '../../services/clients/OrganismService'
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
      accession: String,
    })
    const coordinates = ref([])
    const children = ref([])
    const organisms = ref([])
    watch(
      () => props.accession,
      async (value) => {
        initSearchForm.bioproject = value
        await getBioProjectInfo(value)

      }
    )
    const bioproject = ref({})
    const initPagination = {
    offset: 0,
    limit: 10,
  }
  const initSearchForm = {
    insdc_status: '',
    goat_status: '',
    target_list_status: '',
    bioproject: props.accession,
    filter: '',
    filter_option: '',
  }

  const offset = ref(1)
  const total = ref(0)
  const searchForm = ref({ ...initSearchForm })
  const pagination = ref({ ...initPagination })

    onMounted(async () => {
     await getBioProjectInfo(props.accession)
    })
  
    function getBioProject({ data }: AxiosResponse) {
      bioproject.value = { ...data }

    }
    function getChildren({data}: AxiosResponse){
        children.value = {...data}
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
    async function getBioProjectInfo(accession:string) {
        window.scrollBy({top:0})
        try {
            getBioProject(await BioProjectService.getBioProject(accession))
            getCoordinates(await BioProjectService.getBioProjectCoordinates(accession))
            getChildren(await BioProjectService.getBioprojectChildren(accession))
            searchForm.value = {...initSearchForm}
            pagination.value = {...initPagination}
            const { data } = await OrganismService.getOrganisms({ ...searchForm.value, ...pagination.value })
            organisms.value = [...data.data]
            total.value = data.total
            showData.value = true
        } catch (e) {
            if(e && e.response && e.response.data) error.value = accession + ' ' + e.response.data.message
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
  