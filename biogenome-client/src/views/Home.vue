<template>
<div class="row">
    <div class="flex lg12 md12 sm12 xs12">
        <!-- <va-inner-loading :loading="orgStore.isLoading"> -->
            <div class="row custom-card align--center">
                <div class="flex lg4 md4 sm12 xs12">
                    <div class="row align--center">
                        <div class="flex">
                            <h1 style="text-align:start" class="display-3">
                                {{orgStore.selectedNode.name}}
                            </h1>
                        </div>
                    </div>
                    <div class="row align--center">
                        <div class="flex">
                            <va-chip size="small" style="padding:5px" outline v-for="key in Object.keys(orgStore.selectedNode.metadata)" :key="key">{{key +': '+orgStore.selectedNode.metadata[key]}}</va-chip>
                        </div>
                        <div v-if="hasCoordinates" class="flex">
                            <va-popover :message="'3D World Map'">
                                <router-link :to="{name:'map',params:{accession:orgStore.selectedNode.metadata.accession}}"><va-icon size="large" name="travel_explore"/></router-link>
                            </va-popover>
                        </div>
                    </div>
                </div>
                <div class="flex lg8 md8 sm12 xs12">
                    <!-- <NewDataCards/> -->
                    <DataCards/>
                </div>
            </div>
            <va-divider/>
            <div class="row">
                <div class="flex lg4 md4 sm12 xs12">
                    <!-- <SunBurst/> -->
                    <TreeContainer/>
                </div>
                <div class="flex lg8 md8">
                    <OrganismList @data-selected="getData" @organism-selected="getOrganism" :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
                </div>
            </div>
        <!-- </va-inner-loading> -->
    </div>
</div>
</template>
<script setup>
import OrganismList from '../components/OrganismList.vue'
import DataCards from '../components/DataCards.vue'
import {organisms} from '../stores/organisms'
import {onMounted,computed,watch,ref, nextTick, reactive} from 'vue'
import DataPortalService from '../services/DataPortalService'
import TreeContainer from '../components/TreeContainer.vue'

const orgStore = organisms()
const toggle = ref(true)
const organismLoaded = ref(false)
const dataLoaded = ref(false)
var organism = reactive()

var data = reactive({
    organismName: String,
    values: Array,
    model: String
})

const hasCoordinates = computed(()=>{
    return orgStore.selectedNode.metadata.accession && orgStore.organisms.some(org => org.coordinates.length)
})


function getData(value){
    dataLoaded.value = false
    data.model = value.model
    data.organismName = value.name
    DataPortalService.getData(value.model, {ids: value.ids})
    .then(resp => {
        nextTick(()=>{
            data.values = resp.data
            dataLoaded.value = true
        })
    })
}

onMounted(()=>{
    orgStore.loadOrganisms()
})

watch(orgStore.query, ()=>{
    orgStore.loadOrganisms()
},{deep:true})

function getOrganism(value){
    organismLoaded.value = false
    DataPortalService.getOrganism(value)
    .then(resp => {
        nextTick(()=>{
            organism = resp.data
            organismLoaded.value = true
        })
    })
}

function updateQuery(dataKey){
    console.log(updateQuery)
    orgStore.query[dataKey] = orgStore.query[dataKey] ? null : true
}

</script>