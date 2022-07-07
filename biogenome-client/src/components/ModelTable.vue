<template>
    <div class="row">
        <div class="flex">
            <va-data-table
                sticky-header
                :style="{
                    '--va-data-table-scroll-table-height': '300px',
                    '--va-data-table-scroll-table-color': '#2c82e0',
                }"
                :items="loadedItems.data"
                :columns="loadedItems.columns"
                :hoverable="true"
            >
            <template #header(actions)>
                <va-input
                    label="filter"
                    v-model="params.filter"
                    />
            </template>
            <template #cell(actions)="{ rowData }">
                <va-button @click="editItem(rowData)"  icon="edit"/>
                <va-button @click="confirmDeleteItem(rowData)"  icon="delete"/>
            </template>
            <template #cell(sub_samples)="{ rowData }">
                <va-button-dropdown v-if="rowData.sub_samples && rowData.sub_samples.length" size="small" flat>
                    <ul>
                        <li v-for="acc in rowData.sub_samples" :key="acc">
                            <a class="link">{{acc}}</a>
                        </li>
                    </ul>
                </va-button-dropdown>
            </template>
                <template #headerAppend>
                    <tr style="background-color:white">
                        <th colspan="4">
                            <Pagination
                                :total="loadedItems.count"
                                :query="params"
                            />
                        </th>
                    </tr>
                </template>
            </va-data-table>
            <va-modal v-model="showModal">
            </va-modal>
        </div>
    </div>
</template>
<script setup>
import AnnotationService from '../services/AnnotationService'
import AssemblyService from '../services/AssemblyService'
import BioSampleService from '../services/BioSampleService'
import LocalSampleService from '../services/LocalSampleService'
import ReadService from '../services/ReadService'
import OrganismService from '../services/OrganismService'
import UserService from '../services/UserService'
import {computed, nextTick, onMounted, reactive, ref, watch} from 'vue'

const dataValue = ref('organisms')

const idToDelete = ref('')

const showTable = ref(false)

const showModal = ref(false)

const initParams = {
    offset:0,
    limit:20,
    filter:null,
}

const initLoadedItems = {
    data:null,
    columns:[],
    count:0
}

const loadedItems = reactive({...initLoadedItems})

const params = reactive({...initParams})

watch(params, ()=>{
    getData()
},{deep:true})

watch(dataValue, ()=>{
    showTable.value=false
    Object.assign(params,initParams)
    getData()
})

onMounted(()=>{
    getData()
})

const dataModels = [
    {label:'Organisms',value:'organisms', itemProvider: OrganismService.getOrganisms,
    columns:['scientific_name','taxid','tolid_prefix','actions']},
    {label:'BioSamples',value:'biosamples', itemProvider: BioSampleService.getBioSamples,
    columns:['accession','taxid','sub_samples','actions']},
    {label:'Reads',value:'reads', itemProvider: ReadService.getReads,
    columns:['experiment_accession','instrument_platform','taxid','actions']},
    {label:'Assemblies',value:'assemblies', itemProvider: AssemblyService.getAssemblies,
    columns:['accession','assembly_name','taxid','actions']},
    {label:'Annotations',value:'annotations', itemProvider: AnnotationService.getAnnotations,
    columns:['name','assembly_accession','actions']},
    {label:'Local samples',value:'local_samples', itemProvider: LocalSampleService.getLocalSamples,
    columns:['local_id','taxid','broker','actions']},
    {label:'Portal Users',value:'users', itemProvider: UserService.getUsers,
    columns:['name','role','actions']}
]

const importActions = [
    // {label:'Biosample from EBI'},
    {label:'Organism from NCBI', path:'/organism-form'},
    {label:'Assembly from NCBI', path:'/assembly-form'},
    // {label:'Reads from ENA',path:},
]

const creationActions = [
    {label:'Create organism', path:'/organism-form'},
    // {label:'Create annotation track', path:'/annotation-form'},
    {label:'Create assembly track', path:'/assembly-form'},
    {label:'Import local samples from xlsx file', path:'/excel-form'},
]

function getData(){
    dataModels.forEach(m => {
        if(m.value === dataValue.value){
            m.itemProvider(params)
            .then(resp => {
                console.log(resp)
                nextTick(()=>{
                    loadedItems.data = resp.data.data
                    loadedItems.count = resp.data.count
                    loadedItems.columns = m.columns
                    showTable.value = true
                })
            })
            .catch(e => {
                console.log(e)
            })
        }
    })
}
function editItem(item){
    console.log(item)
}

function confirmDeleteItem(item){
    const id = item.accession || item.name || item.local_id || item.experiment_accession || item.taxid
    console.log(id)
}
// const editableModel = [
//     {model:'local_samples',},
//     'organisms',
//     'assemblies',//assembly track
//     'annotations',
//     'users'
// ]

</script>