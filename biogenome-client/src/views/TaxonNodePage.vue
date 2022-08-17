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
    <div class="row custom-card justify--space-between">
        <!-- <div class="flex lg6 md6 sm12 xs12">
            <va-card class="custom-card">
                <va-card-title>
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p>children</p>
                        </div>
                        <div class="flex">
                            <va-icon 
                                name="pets"
                            >
                            </va-icon>
                        </div>
                    </div>
                </va-card-title>
                <va-card-content style="max-height:50vh;overflow:scroll">
                    <va-list>
                        <va-list-item
                            v-for="(node, index) in orgStore.selectedNode.children"
                            :key="index"
                            :to="{name:'taxons',params:{id:node.taxid}}"
                        >
                        <va-list-item-section style="text-align:start">
                            <va-list-item-label>
                            {{ node.title || node.name}}
                            </va-list-item-label>
                            <va-list-item-label caption>
                            {{ node.rank || node.accession}}
                            </va-list-item-label>
                        </va-list-item-section>
                        <va-list-item-section icon>
                            <va-icon
                                name="visibility"
                            />
                        </va-list-item-section>
                        </va-list-item>
                    </va-list>
                </va-card-content>
            </va-card>
        </div> -->
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
        <div class="flex lg8 md8 sm12 xs12">
            <div class="row justify--end">
                <div class="flex">
                    <va-button-toggle
                        size="small"
                        outline
                        v-model="currentModel"
                        :options="filteredModelOptions"
                    />
                </div>
            </div>
            <div class="row">
                <div v-if="showMap" class="flex lg12 md12 sm12 xs12">
                    <CesiumComponent @on-entity-selection="updateQuery" class="custom-card" :geojson = "geojson"/>
                </div>
                <div v-if="showTree" class="flex lg12 md12 sm12 xs12">
                    <TreeOfLife :node="id"/>
                </div>
            </div>
        </div>
    </div>
</div>
</template>
<script setup>
import NewDataCards from '../components/NewDataCards.vue'
import OrganismList from '../components/OrganismList.vue'
import DataCards from '../components/DataCards.vue'
import {organisms} from '../stores/organisms'
import {onMounted,watch,ref,computed} from 'vue'
import DataPortalService from '../services/DataPortalService'
import CesiumComponent from '../components/CesiumComponent.vue'
import OrganismFilter from '../components/OrganismFilter.vue'
import TreeOfLife from '../components/d3/TreeOfLife.vue'

const props = defineProps({
    id:String
})
const showMap = ref(false)
const showTree = ref(true)
let geojson = {}
const orgStore = organisms()
const currentModel = ref('tree')
const modelOptions = [
    {value:'tree',
    icon: 'insights'},
    {value:'map',
    icon: 'travel_explore'},
]
const filteredModelOptions = ref([
    {value:'tree',
    icon: 'insights'}
])


watch(currentModel, ()=>{
    switch(currentModel.value){
        case 'map':
            showMap.value=true
            showTree.value=false
            break
        case 'tree':
            showMap.value=false
            showTree.value=true
            break
    }
})
onMounted(()=>{
    orgStore.query.parent_taxid = props.id
    orgStore.loadOrganisms()
    orgStore.getTaxonNode()
    DataPortalService.getTaxonCoordinates(props.id)
    .then(resp => {
        if(resp.data.features && resp.data.features.length){
            geojson = resp.data
            filteredModelOptions.value.push({value:'map',icon: 'travel_explore'})
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
.side-input{
    padding: 15px;
}
.collapse-row{
    background-color: white;
}

.sidebar{
    background-color: #0c7c59;
}
</style>