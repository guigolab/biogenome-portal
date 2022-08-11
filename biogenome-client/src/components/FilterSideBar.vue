<template>
<va-card class="custom-card">
    <va-card-title>
        Filters
    </va-card-title>
    <va-card-content>
        <div style="text-align:start">
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <div @click="showTaxonomy=!showTaxonomy" class="row justify--space-between align--center">
                        <div class="flex">
                            <p class="">Taxonomy</p>
                        </div>
                        <div class="flex">
                            <va-icon :name="!!showTaxonomy?'expand_less':'expand_more'"/>
                        </div>
                    </div>
                    <Transition name="collapse">
                        <div v-if="showTaxonomy">
                            <div style="padding:15px" class="row justify--space-between">
                                <div class="flex">
                                    <input class="filter-input" v-model="taxonFilter"/>
                                </div>
                                <div class="flex">
                                    <va-button size="small" icon="search"></va-button>
                                </div>
                            </div>
                            <div class="row">
                                <div class="flex lg12 md12 sm12 xs12">
                                    <div style="background-color: #eff3f8;">
                                        <div style="width:100%;height:400px;overflow: scroll;">
                                            <va-inner-loading :loading="isTaxonTreeLoading">
                                                <div v-for="(node,index) in [treeStore.taxonomyTree]" :key="index">
                                                    <NodeIterator :node="node" :model="taxonModel"/>
                                                </div>
                                            </va-inner-loading>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
            <va-divider/>
            <div class="row" @click="showBioprojects=!showBioprojects">
                <div class="flex lg12 md12 sm12 xs12">
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p class="">BioProjects</p>
                        </div>
                        <div class="flex">
                            <va-icon :name="!!showBioprojects?'expand_less':'expand_more'"/>
                        </div>
                    </div>
                </div>
            </div>
            <va-divider/>
            <div class="row" @click="showScientificName=!showScientificName">
                <div class="flex lg12 md12 sm12 xs12">
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p class="">Scientific Name</p>
                        </div>
                        <div class="flex">
                            <va-icon :name="!!showScientificName?'expand_less':'expand_more'"/>
                        </div>
                    </div>

                </div>
            </div>
            <va-divider/>
            <div class="row" @click="showCommonName=!showCommonName">
                <div class="flex lg12 md12 sm12 xs12">
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p class="">Common Name</p>
                        </div>
                        <div class="flex">
                            <va-icon :name="!!showCommonName?'expand_less':'expand_more'"/>
                        </div>
                    </div>
                </div>
            </div>
            <va-divider/>
            <div class="row" @click="showTaxid=!showTaxid">
                <div class="flex lg12 md12 sm12 xs12">
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p class="">Tax ID</p>
                        </div>
                        <div class="flex">
                            <va-icon :name="!!showTaxid?'expand_less':'expand_more'"/>
                        </div>
                    </div>
                </div>
            </div>
            <va-divider/>
            <div class="row" @click="showTolid=!showTolid">
                <div class="flex lg12 md12 sm12 xs12">
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p class="">ToLID</p>
                        </div>
                        <div class="flex">
                            <va-icon :name="!!showTolid?'expand_less':'expand_more'"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </va-card-content>
</va-card>


    
</template>
<script setup>
import {ref,watch} from 'vue'
import DataPortalService from '../services/DataPortalService';
import {tree} from '../stores/tree'
const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION

const taxonModel = {
    label: 'Taxonomy',
    value: 'taxons', 
    searchQuery:DataPortalService.searchTaxons,
    defaultQuery:DataPortalService.getTaxonChildren,
    root:ROOTNODE,
    organismQuery: 'parent_taxid',
    respLabel: 'name',
    metadataFields: ['taxid','leaves','rank'],
    id: 'taxid'
}
const bioprojectModel = {
    label: 'BioProjects',
    value: 'bioprojects', 
    searchQuery:DataPortalService.searchBioprojects,
    defaultQuery:DataPortalService.getBioProjectChildren,
    root:PROJECT_ACCESSION,
    organismQuery: 'bioproject',
    respLabel: 'title',
    metadataFields: ['accession'],
    id: 'accession'
}

const showBioprojects = ref(false)
const showTaxonomy = ref(false)
const showScientificName = ref(false)
const showCommonName = ref(false)
const showTaxid = ref(false)
const showTolid = ref(false)
const taxonFilter = ref('')
const isTaxonTreeLoading = ref(false)
const isBioprojectTreeLoading = ref(false)
const treeStore = tree()

watch(showTaxonomy,()=>{
    if(showTaxonomy.value){
        getTaxons()
    }
})

watch(showBioprojects,()=>{
    if(showBioprojects.value){
        getBioprojects()
    }
})

function getTaxons(){
    isTaxonTreeLoading.value = true
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
            treeStore.taxonomyTree = resp.data
            isTaxonTreeLoading.value = false

    }).catch(e => {
        console.log(e)
        isTaxonTreeLoading.value = false
    })
}
function getBioprojects(){
    isBioprojectTreeLoading.value = true
    DataPortalService.getBioProjectChildren(PROJECT_ACCESSION)
    .then(resp => {
        treeStore.bioprojectsTree = resp.data
        isBioprojectTreeLoading.value = false
    })
    .catch(e => {
        console.log(e)
        isBioprojectTreeLoading.value = false
    })
}
</script>
<style scoped>

.filter-input{

}
</style>