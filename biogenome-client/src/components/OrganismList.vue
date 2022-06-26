<template>
<va-inner-loading :loading="isLoading">
<va-card stripe stripe-color="secondary" class="custom-card">
    <va-card-title>
        organisms
    </va-card-title>
    <va-card-content>
        <div class="row justify--space-between">
            <div class="flex">
                <va-button-dropdown color="gray" leftIcon flat outline :label="(query.offset+1)+'-'+(limit+query.offset>total?total:limit+query.offset)+' of '+total">
                    <va-button :disabled="query.offset === 0" @click="query.offset=0" flat color="gray">Start</va-button>
                    <va-button :disabled="query.offset+limit >= total" @click="query.offset=total-limit" flat color="gray">End</va-button>
                </va-button-dropdown>
            </div>
            <div class="flex">
                <va-button color="gray" v-if="query.offset-limit > 0" @click="query.offset=query.offset-limit" flat icon="chevron_left"/>
                <va-button color="gray" v-if="query.offset+limit < total" @click="query.offset=query.offset+limit" flat icon="chevron_right"/>
            </div> 
        </div>
        <va-divider/>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12" style="height:50vh;overflow:scroll" v-if="props.organisms.length">
                <ul>
                    <li v-for="(item, index) in props.organisms"
                        :key="index"
                        class="organism-item">
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <div class="row" style="margin-bottom:5px">
                                    <div v-if="item.image_url" class="flex">
                                        <va-avatar>
                                            <img :src="item.image_url">
                                        </va-avatar>
                                    </div>
                                    <div class="flex">
                                        <a :href="`/organisms/${item.taxid}`" class="link">{{item.scientific_name}}</a>
                                        <!-- <a @click.stop.prevent="$emit('organismSelected', item.taxid)" class="link">{{item.scientific_name}}</a> -->
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="flex text--secondary" style="padding-left:10px">
                                        <p style="text-align:start" v-if="item.insdc_common_name"><i>{{item.insdc_common_name}}</i></p>
                                        <p style="text-align:start">{{item.tolid_prefix}}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex">
                                <div class="row justify--space-between">
                                    <div style="margin:0 10px 0 10px" v-for="dt in mapData(item)" :key="dt" class="flex">
                                        <va-icon
                                            :name="dataIcons[dt].icon"
                                            :color="dataIcons[dt].color"
                                            @click="getData(dt, item.taxid, item.scientific_name)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <va-divider/>
                    </li>
                </ul>    
            </div>
            <div v-else class="flex text--secondary">
                <p>No organisms found</p>
            </div>
        </div>
    </va-card-content>
    <va-modal v-model="showModal">
        <template #header>
            <va-badge :color="dataIcons[popupData.model].color" :text="popupData.data.length"><h2>{{popupData.title}}</h2></va-badge>
        </template>
        <DataTable :items="popupData.data" :columns="dataIcons[popupData.model].fields" :color="dataIcons[popupData.model].color"/>
    </va-modal>
</va-card>
</va-inner-loading>
</template>
<script setup>
import { watch,nextTick,ref, reactive } from 'vue'
import {dataIcons} from '../../config'
import portalService from '../services/DataPortalService'
import OrganismForm from '../components/OrganismForm.vue'
import DataTable from '../components/data/DataTable.vue'

const isLoading = ref(false)

const props = defineProps({
    organisms: Array,
    query: Object,
    total:String
})


const toggledMetadata = reactive({
    name:'',
    metadata:{}
})
const showMetadata = ref(false)
const showModal = ref(false)
const limit = ref(props.query.limit)
const popupData = reactive({
    title:'',
    model:'',
    data:''
})
function mapData(item){
    return Object.keys(item).filter(k => ['local_samples','biosamples','assemblies','experiments','annotations'].includes(k))
    .filter(key => item[key].length)
}
function getData(model,taxid,scientific_name){
    isLoading.value = true
    portalService.getData(model,taxid)
    .then(resp => {
        popupData.title = scientific_name +' '+model
        popupData.model=model
        popupData.data = resp.data
        isLoading.value = false
        showModal.value = true
    })
    .catch(e => {
        console.log(e)
        isLoading.value=false
    })

}

function toggleMetadata(rowData){
    toggledMetadata.name = rowData.accession || rowData.experiment_accession || rowData.local_id || rowData.name
    toggledMetadata.metadata = {...rowData.metadata}
    showMetadata.value = true    
}
</script>
<style scoped>
li.organism-item{
    padding: 5px;
}
li.organism-item:hover{
    background-color: #eff3f8;
}
</style>