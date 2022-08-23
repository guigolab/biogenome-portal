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
        <div class="flex lg8 md8 sm12 xs12">
            <CesiumComponent @on-entity-selection="updateQuery" class="custom-card" :geojson = "geojson"/>
        </div>
        <div class="flex lg4 md4 sm12 xs12">
            <OrganismFilter/>
            <OrganismList :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
        </div>
    </div>
    <div v-else class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <OrganismFilter/>
            <OrganismList :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query" :is-loading="orgStore.isLoading"/>
        </div>
    </div>
    <!-- <div v-if="showTree" class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <TreeOfLife :node="id"/>
        </div>
    </div> -->
    <!-- <div class="row custom-card justify--space-between">
        <div class="flex lg4 md4 sm12 xs12">
            <div class="row">
                <div class="flex">
                    <OrganismFilter/>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
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
        <div class="row">
        </div>
    </div> -->
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

// import TreeOfLife from '../components/d3/TreeOfLife.vue'

const props = defineProps({
    id:String
})
const showMap = ref(false)
const showTree = ref(true)
let geojson = {}
const orgStore = organisms()
// const currentModel = ref('tree')
// const modelOptions = [
//     {value:'tree',
//     icon: 'insights'},
//     {value:'map',
//     icon: 'travel_explore'},
// ]
// const filteredModelOptions = ref([
//     {value:'tree',
//     icon: 'insights'}
// ])


// watch(currentModel, ()=>{
//     switch(currentModel.value){
//         case 'map':
//             showMap.value=true
//             showTree.value=false
//             break
//         case 'tree':
//             showMap.value=false
//             showTree.value=true
//             break
//     }
// })
onMounted(()=>{
    DataPortalService.getTaxonCoordinates(props.id)
    .then(resp => {
        if(resp.data.features && resp.data.features.length){
            geojson = resp.data
            showMap.value = true
        }
    })
    orgStore.query.parent_taxid = props.id
    orgStore.loadOrganisms()
    orgStore.getTaxonNode()

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