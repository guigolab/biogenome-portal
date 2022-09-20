<template>
<div>
    <div style="min-height:30vh" class="row custom-card align--center justify--space-between">
        <div class="flex">
            <div v-if="showData.node" class="row align--center justify--space-between">
                <div class="flex">
                    <h1 style="text-align:start" class="display-3">
                        {{selectedNode.name}}
                    </h1>
                    <div class="row">
                        <div class="flex">
                            <va-chip size="small" style="padding:5px" outline v-for="key in Object.keys(selectedNode.metadata)" :key="key">{{key +': '+selectedNode.metadata[key]}}</va-chip>
                        </div>
                    </div>
                </div>
                <Transition name="slide-fade">
                    <div v-if="showData.stats" class="flex">
                        <DataCards @on-data-selection="updateQuery" :query="query" :statistics="stats" :total="total"/>
                    </div>
                </Transition>
            </div>
        </div>
    </div>
    <va-divider/>
    <div class="row">
        <div class="flex lg4 md4 sm12 xs12">
            <OrganismFilter @on-search="filterOrganisms"/>
        </div>
    </div>
    <Transition name="slide-fade">
        <div class="row" v-if="showData.map && showData.organisms">
            <div class="flex lg4 md4 sm12 xs12">
                <OrganismList :total="total" :organisms="organisms" :query="organismQuery" 
                @update="updateOrganisms"/>
            </div>
            <div class="flex lg8 md8 sm12 xs12">
                <CesiumComponent :counter="mapCounter" @on-entity-selection="getOrganismsAtCoordinates" class="custom-card" :geojson = "geojson"/>
            </div>
        </div>
    </Transition>
    <Transition name="slide-fade">
        <div v-if="!showData.map && showData.organisms" class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <OrganismList :total="total" :organisms="organisms" :query="organismQuery"/>
            </div>
        </div>
    </Transition>
</div>
</template>

<script setup>
import OrganismList from '../components/OrganismList.vue'
import DataCards from '../components/DataCards.vue'
import {onMounted,watch,ref,computed, reactive} from 'vue'
import DataPortalService from '../services/DataPortalService'
import CesiumComponent from '../components/CesiumComponent.vue'
import OrganismFilter from '../components/OrganismFilter.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
    id:String
})
const selectedNode=ref({})
const mapCounter=ref(0)
const initDataQuery = {
    parent_taxid:'',
    bioproject:'',
    biosamples:null,
    local_samples:null,
    assemblies:null,
    experiments:null,
    annotations:null,
}
const query = reactive({...initDataQuery})
const organismQuery = reactive({
    offset:0,
    limit:20,
    filter:null,
    filter_option:null,
    geo_location:null,
    ...initDataQuery
})
const showData = reactive({
    node:false,
    map:false,
    organisms:false,
    stats:false
})
const organisms = ref([])
let geojson = {}
const stats = ref({})
const total = ref(0)

onMounted(()=>{
    const model = router.currentRoute.value.name
    if(model === 'taxons'){
        query.parent_taxid = props.id
        organismQuery.parent_taxid=props.id
    }else{
        query.bioproject = props.id
        organismQuery.bioproject=props.id
    }
    const nodePromise = model === 'taxons' ? DataPortalService.getTaxonChildren : DataPortalService.getBioProjectChildren
    nodePromise(props.id)
    .then(resp => {
        selectedNode.value.name = resp.data.title || resp.data.name
        selectedNode.value.metadata = resp.data.taxid ? {taxid:resp.data.taxid, rank: resp.data.rank} : {accession: resp.data.accession}
        if(resp.data.leaves){
            selectedNode.value.metadata.leaves = resp.data.leaves
        }
        showData.node=true
        return DataPortalService.getOrganismStats(query)
    })
    .then(resp => {
        stats.value = resp.data
        showData.stats=true
        return DataPortalService.getOrganisms(organismQuery)
    })
    .then(resp => {
        organisms.value = resp.data.data
        total.value = resp.data.total
        return DataPortalService.getNodeCoordinates(query)
    })
    .then(resp => {
        geojson = resp.data
        if(geojson.features && geojson.features.length){
            showData.map=true
        }
        showData.organisms=true
    })
})

function updateQuery(value){
    const valueToSet = query[value] ? null:true
    organismQuery.offset = 0
    organismQuery[value] = valueToSet
    query[value] = valueToSet
    DataPortalService.getOrganisms(organismQuery)
    .then(resp => {
        organisms.value = resp.data.data
        total.value = resp.data.total
        showData.organisms=true
        return DataPortalService.getOrganismStats(query)
    })
    .then(resp => {
        stats.value = resp.data
        showData.stats=true
        return DataPortalService.getNodeCoordinates(query)
    })
    .then(resp => {
        geojson = resp.data
        if(geojson.features && geojson.features.length){
            showData.map=true
            mapCounter.value++
        }else{
            showData.map = false
        }
    })
}

function updateOrganisms(value){
    organismQuery.offset = value
    DataPortalService.getOrganisms(organismQuery)
    .then(resp => {
        organisms.value = resp.data.data
        total.value = resp.data.total
    })
}

function getOrganismsAtCoordinates(value){
    organismQuery.geo_location = value
    DataPortalService.getOrganisms(organismQuery)
    .then(resp => {
        organisms.value = resp.data.data
        total.value = resp.data.total
        showData.stats = value?false:true
    })
}

function filterOrganisms(payload){
    const setter = payload.value ? false : true
    showData.stats = setter
    showData.map = setter
    organismQuery.filter=payload.value
    organismQuery.filter_option=payload.option
    DataPortalService.getOrganisms(organismQuery)
    .then(resp => {
        organisms.value = resp.data.data
        total.value = resp.data.total
    })
}

</script>
<style scoped>
.slide-fade-enter-active {
  transition: all 0.2s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>