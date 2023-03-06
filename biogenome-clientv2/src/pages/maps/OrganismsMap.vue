<template>
  <p class="va-title">Organisms Geographic locations</p>
  <va-divider />
  <va-inner-loading :loading="isLoading">
    <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
            <va-card-content>
                <div class="row align-center justify-end">
                    <div class="flex lg4 md4 sm12 xs12">
                        <va-select
                            v-model="locationStore.searchForm.parent_taxid"
                            label="search parent taxon"
                            placeholder="Search by taxon name"
                            searchable
                            :options="taxons"
                            text-by="name"
                            track-by="taxid"
                            value-by="taxid"
                            @update-search="searchTaxon"
                        />
                    </div>
                    <div class="flex lg4 md4 sm12 xs12">
                        <va-select
                            v-model="locationStore.searchForm.bioproject"
                            label="search BioProject"
                            placeholder="Search by project title"
                            searchable
                            :options="bioprojects"
                            text-by="title"
                            track-by="accession"
                            value-by="accession"
                            @update-search="searchBioProject"
                        />
                    </div>
                    <div class="flex lg4 md4 sm12 xs12">
                        <va-card-action>
                            <va-button>Submit</va-button>
                            <va-button>Reset</va-button>
                        </va-card-action>
                    </div>
                </div>
            </va-card-content>
            <va-card-content  v-if="coordinates.length">
                <div style="height: 80vh;" class="row row-equal">
                    <div class="flex lg12 md12 sm12 xs12">
                        <LeafletMap :key="counter" :coordinates="coordinates" />
                    </div>
                </div>
            </va-card-content>
            <va-card-content v-else-if="errorMessage">
                 <va-alert color="danger">{{ errorMessage }}</va-alert>
            </va-card-content>
    </div>
  </div>
</va-inner-loading>

</template>
<script setup lang="ts">
    import { AxiosResponse } from 'axios';
    import { computed, onMounted, ref, watch } from 'vue';
    // import CesiumNode from '../../components/maps/CesiumNode.vue'
    import LeafletMap from '../../components/maps/LeafletMap.vue';
    import OrganismService from '../../services/clients/OrganismService';
    import { useLocationStore } from '../../stores/location-store';
    import TaxonService from '../../services/clients/TaxonService';
    import BioProjectService from '../../services/clients/BioProjectService';

    const errorMessage = ref('')
    const counter = ref(0)
    const isLoading = ref(false)
    const locationStore = useLocationStore()
    const bioprojects = ref([])
    const taxons = ref([])

    watch(
        () => locationStore.searchForm.bioproject,
        (bioproject) => {
        handleSubmit()
        },
    )

    watch(
        () => locationStore.searchForm.parent_taxid,
        (parent) => {
        handleSubmit()
        },
    )
    const coordinates = ref([])

    onMounted(async () => {
        getCoordinates(await OrganismService.getOrganismsLocations({ ...locationStore.searchForm }))
    })

    async function handleSubmit() {
        getCoordinates(await OrganismService.getOrganismsLocations({ ...locationStore.searchForm }))
    }


    function getCoordinates({ data }: AxiosResponse) {
        coordinates.value = []
        isLoading.value = true
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
        if(!coordinates.value.length){
            errorMessage.value = 'No organisms match the query'
        }
        counter.value++
        isLoading.value = false

    }
      async function searchBioProject(value: string) {
          if (value.length >= 3) {
            const { data } = await BioProjectService.getBioprojects({ filter: value })
            bioprojects.value = [...data.data]
          }
        }
        async function searchTaxon(value: string) {
          if (value.length >= 3) {
            const { data } = await TaxonService.getTaxons({ filter: value })
            taxons.value = [...data.data]
          }
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

  .list__item + .list__item {
    margin-top: 10px;
  }
</style>
