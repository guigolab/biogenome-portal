<template>
<div class="row">
    <div class="flex lg4 md4 sm12 xs12">
        <SunBurst/>
        <!-- <TreeSideBar/> -->
    </div>
    <div class="flex lg8 md8 sm12 xs12">
        <va-card class="custom-card">
            <va-card-title>
                <div class="row justify--space-between">
                    <div class="flex">
                        <h1 class="display-5">
                            {{orgStore.selectedNode.name}}
                        </h1>
                    </div>
                    <div class="flex">
                        <va-popover :message="orgStore.selectedNode.metadata.rank?'Tree of Life UI':'3D World Map'">
                            <router-link :to="{name:'map',params:{accession:orgStore.selectedNode.metadata.accession}}"><va-icon size="large" :name="orgStore.selectedNode.metadata.rank?'call_split':'travel_explore'"/></router-link>
                        </va-popover>
                    </div>
                </div>

            </va-card-title>
            <va-card-content>
            <div class="row">
                <div style="text-align:start" class="flex lg12 md12">
                    <va-chip outline v-for="key in Object.keys(orgStore.selectedNode.metadata)" :key="key" size="small">{{key +': '+orgStore.selectedNode.metadata[key]}}</va-chip>
                </div>
            </div>
            <div class="row justify--center">
                <div class="flex lg12 md12">
                    <DataCards/>
                </div>
            </div>
            </va-card-content>
            <va-divider/>
            <va-card-content>
            <div class="row">
                <div class="flex lg12 md12">
                    <OrganismForm/>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12">
                    <OrganismList @data-selected="getData" @organism-selected="getOrganism" :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query"/>
                </div>
                <!-- <div class="flex">
                    <OrganismForm/>
                </div> -->
            </div>
            </va-card-content>
        </va-card>
    </div>
</div>
<!-- <div class="row">
    <div class="flex">
        <DataCards/>
    </div>
    <div class="flex">
        <OrganismForm/>
    </div>
</div> -->
<!-- <div class="row">
    <div class="flex">
    </div>
    <div class="flex">
        <OrganismList @data-selected="getData" @organism-selected="getOrganism" :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query"/>
    </div>
    <div class="flex lg6 md6">
        <div class="row">
            <div class="flex lg12">
                <OrganismDetails v-if="organismLoaded" :organism="organism"/>
            </div>
            <div v-if="dataLoaded" class="flex lg12">
                <va-card class="custom-card">
                    <va-card-title>
                        {{data.model+' of '+data.organismName}}
                    </va-card-title>
                    <va-card-content>
                        <va-data-table :items="data.values"/>
                    </va-card-content>
                </va-card>
            </div>
        </div>
    </div>
</div> -->

</template>
<script setup>
import BarChart from '../components/BarChart.vue'
import OrganismDetails from '../components/OrganismDetails.vue'
import TaxonBreadCrumbs from '../components/TaxonBreadCrumbs.vue'
import OrganismList from '../components/OrganismList.vue'
import OrganismTable from '../components/OrganismTable.vue'
import TreeSideBar from '../components/TreeSideBar.vue'
import DataCards from '../components/DataCards.vue'
import OrganismForm from '../components/OrganismForm.vue'
import {organisms} from '../stores/organisms'
import {taxons} from '../stores/taxons'
import {onMounted,watch,ref, nextTick, reactive} from 'vue'
import DataPortalService from '../services/DataPortalService'
import SunBurst from '../components/SunBurst.vue'

const orgStore = organisms()
const taxStore = taxons()
const toggle = ref(true)
const organismLoaded = ref(false)
const dataLoaded = ref(false)
var organism = reactive()

var data = reactive({
    organismName: String,
    values: Array,
    model: String
})

function toggleNode(value){
    toggle.value = value
}
function toggleCrumb(value){
    taxStore.taxonNav = [...value.taxonNav]
    taxStore.tree = {...value.tree}
    orgStore.query.parent_taxid = value.taxid
}

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