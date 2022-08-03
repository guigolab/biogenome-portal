<template>
<va-inner-loading :loading="isLoading">
    <div class="row align--center">
        <div style="padding:15px" class="flex">
            <h1 class="display-3">{{bioproject.title}}</h1>
            <div class="row justify--space-between">
                <div class="flex">
                    <p class="text--secondary">{{props.accession}}</p>
                </div>
            </div>
        </div>
        <div style="padding:15px" class="flex">
            <va-badge :text="bioproject.parents.length" overlap color="secondary">
                <va-button-dropdown
                    v-if="bioproject.parents.length"
                    label="Parents"
                    outline
                >
                    <ul style="max-height:300px;overflow:scroll;padding:5px">
                        <li @click="selectProject(parent.accession)" v-for="parent in bioproject.parents" :key="parent.accession" class="link">
                            {{parent.title}}
                        </li>
                    </ul>
                </va-button-dropdown>
            </va-badge>
            <va-badge :text="bioproject.children.length" overlap color="secondary">
                <va-button-dropdown
                    v-if="bioproject.children.length"
                    label=Children
                    outline
                >
                    <ul style="max-height:300px;overflow:scroll;padding:5px">
                        <li @click="selectProject(child.accession)" v-for="child in bioproject.children" :key="child.accession" class="link">
                            {{child.title}}
                        </li>
                    </ul>
                </va-button-dropdown>
            </va-badge>
        </div>
    </div>
    <va-divider/>
    <div class="row">
        <Transition>
            <div class="flex lg4 md4 sm12 xs12">
                <OrganismList :organisms="organisms" :total="total" @on-update-query="updateQuery" :query="query"/>
            </div>
        </Transition>
        <div class="flex lg8 md8 sm12 xs12">
            <va-card class="custom-card">
                <va-card-title>World map</va-card-title>
                <va-card-content class="map-container">
                    <CesiumComponent @on-entity-selection="updateQuery" v-if="showMap" :geojson="geojson"/>
                </va-card-content>
            </va-card>
        </div>
    </div>
</va-inner-loading>
</template>
<script setup>
import { onMounted, reactive, nextTick,ref, watch } from 'vue'
import CesiumComponent from '../components/CesiumComponent.vue'
import OrganismList from '../components/OrganismList.vue'
import DataPortalService from '../services/DataPortalService'
import {useRouter} from 'vue-router'
const isLoading = ref(false)
var showOrganisms = ref(false)
var geojson = reactive(null)
var showMap = ref(false)
const router = useRouter()

const bioproject = reactive({
    title: '',
    children:[],
    parents:[]
})

const props = defineProps({
    accession:null
})

var organisms = ref([])
var total = ref(0)

const query = reactive({
    parent_taxid:null,
    offset:0,
    limit:20,
    filter:null,
    filter_option:null,//scientificName by default
    bioproject:props.accession,
    coordinates:true,
    geo_location:null,
    biosamples:null,
    local_samples:null,
    assemblies:null,
    experiments:null,
    annotations:null,
    sort_order:null,
    sort_column:null
})

function selectProject(accession){
    props.accession = accession
    query.geo_location = null
    updateData()
}

watch(query, newValue=>{
    DataPortalService.getOrganisms(newValue)
    .then(resp => {
        organisms.value = resp.data.data
        total.value = resp.data.total
    })
})
function getCoordinates(){
    if(props.accession){
        console.log('yes biop')
        return DataPortalService.getAllCoordinates({bioproject:props.accession})
        // })
    }else{
        console.log('not biop')
        return DataPortalService.getAllCoordinates()
    }
}

function updateData(){
    showMap.value = false
    isLoading.value = true
    getCoordinates()
    .then(resp => {
        geojson = resp.data
        showMap.value = true
        return DataPortalService.getOrganisms(query)
    })
    .then(resp => {
        if(props.accession){
            organisms.value = resp.data.data
            total.value = resp.data.total
            DataPortalService.getBioProjectChildren(props.accession)
            .then(resp => {
                bioproject.title = resp.data.title
                bioproject.children = resp.data.children
                bioproject.parents = resp.data.parents
                query.bioproject = props.accession
                isLoading.value = false
            })
        }else{
            organisms.value = resp.data.data
            total.value = resp.data.total
            isLoading.value = false
        }
    })
    .catch(e => {
        console.log(e)
        isLoading.value = false
    })
}

onMounted(()=>{
    updateData()
})

function updateQuery(payload){
    query[payload.label] = payload.value
}

</script>
<style>
.map-container{
    width: 100%;
    height: 100%;
    min-height: 600px
}
</style>
<style scoped>
/* we will explain what these classes do next! */
.v-enter-active{
  transition: opacity 0.5s ease;
}

.v-enter-from{
  opacity: 0;
}
</style>