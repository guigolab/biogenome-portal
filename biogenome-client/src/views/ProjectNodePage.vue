<template>
<div>
    <div class="row custom-card align--center justify--space-between">
        <div class="flex">
            <div class="row align--center justify--space-between">
                <div class="flex">
                    <h1 style="text-align:start" class="display-3">
                        {{orgStore.selectedNode.name}}
                    </h1>
                    <div class="row">
                        <div class="flex">
                            <va-chip size="small" style="padding:5px" outline v-for="key in Object.keys(orgStore.selectedNode.metadata)" :key="key">{{key +': '+orgStore.selectedNode.metadata[key]}}</va-chip>
                        </div>
                    </div>
                </div>
                <div class="flex">
                    <DataCards/>
                </div>
            </div>
        </div>
    </div>
    <va-divider/>
    <div class="row" v-if="showMap">
        <div class="flex lg4 md4 sm12 xs12">
            <OrganismFilter/>
            <OrganismList :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
        </div>
        <div class="flex lg8 md8 sm12 xs12">
            <CesiumComponent @on-entity-selection="updateQuery" class="custom-card" :geojson = "geojson"/>
        </div>
    </div>
    <div v-else class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <OrganismFilter/>
            <OrganismList :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
        </div>
    </div>
    <!-- <div class="row custom-card justify--space-between">
        <div class="flex lg4 md4 sm12 xs12">
            <div class="row">
                <div class="flex">
                    <OrganismFilter/>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <OrganismList :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
                </div>
            </div>
        </div>
        <div v-if="showMap" class="flex lg8 md8 sm12 xs12">
            <CesiumComponent @on-entity-selection="updateQuery" class="custom-card" :geojson = "geojson"/>
        </div>
    </div> -->
</div>
</template>
<script setup>
import OrganismList from '../components/OrganismList.vue'
import NodeIterator from '../components/NodeIterator.vue'
import NewDataCards from '../components/NewDataCards.vue'
import DataCards from '../components/DataCards.vue'
import {organisms} from '../stores/organisms'
import { tree } from '../stores/tree'
import {onMounted,computed,watch,ref, nextTick, reactive} from 'vue'
import DataPortalService from '../services/DataPortalService'
import TreeContainer from '../components/TreeContainer.vue'
import FilterSideBar from '../components/FilterSideBar.vue'
import CesiumComponent from '../components/CesiumComponent.vue'
import OrganismFilter from '../components/OrganismFilter.vue'

const props = defineProps({
    id:String
})

const orgStore = organisms()
const showMap = ref(false)
let geojson = {}

onMounted(()=>{
    orgStore.query.bioproject = props.id
    orgStore.loadOrganisms()
    orgStore.getProjectNode()
    DataPortalService.getProjectCoordinates(props.id)
    .then(resp => {
        if(resp.data.features && resp.data.features.length){
            geojson = resp.data
            showMap.value = true
        }
    })
})

watch(orgStore.query, ()=>{
    orgStore.loadOrganisms()
},{deep:true})

function updateQuery(value){
    orgStore.query.geo_location = value
}
</script>
<style scoped>

</style>