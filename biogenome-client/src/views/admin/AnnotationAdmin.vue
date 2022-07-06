<template>
<div class="layout">
    <div class="row">
        <div class="flex">
            <AssemblyInput 
                :accession="annotation.assembly_accession"
                :validAssembly="validAssembly"
                :assemblyObj="assemblyObj"
                @valid-assembly="handleAssembly"
            />
        </div>
    </div>
    <div class="row">
        <va-data-table
            sticky-header
            :style="{
                '--va-data-table-scroll-table-height': '300px',
                '--va-data-table-scroll-table-color': '#2c82e0',
            }"
            :items="annotations.data"
            :columns="annotationColumns"
            :hoverable="true"
        >
        <template #header(actions)>
            <va-input
                label="filter"
                v-model="params.filter"
                />
        </template>
        <template #cell(actions)="{ rowData }">
            <va-button @click="editAnnotation(rowData)" icon="edit"/>
            <va-button color="danger" @click="confirmDeleteAnnotation(rowData.name)" icon="delete"/>
        </template>
            <template #headerAppend>
                <tr style="background-color:white">
                    <th colspan="4">
                        <Pagination
                            :total="assemblies.count"
                            :query="params"
                        />
                    </th>
                </tr>
            </template>
        </va-data-table>
        <va-modal
            v-model="showModal"
            hide-default-actions
            overlay-opacity="0.2"
        >
            <template #header>
            <h2>Are you sure??</h2>
            </template>
            <div>{{`this will permanetly remove ${selectedAnnotation}` }}</div>
            <template #footer>
            <va-button @click="clearDeleteSelection()">
                Cancel
            </va-button>
            <va-button @click="deleteAnnotation()" color="danger">
                Delete
            </va-button>
            </template>
        </va-modal>
    </div>
</div>

</template>
<script setup>
import Pagination from '../../components/Pagination.vue'
import AssemblyInput from '../../components/AssemblyInput.vue'
import SubmissionService from '../../services/SubmissionService'
import DataPortalService from '../../services/DataPortalService'
import {onMounted, reactive,ref, watch} from 'vue'


const selectedAnnotation = ref('')

const annotationColumns = ['name','taxid','assembly_accession']
const showModal = ref(false)
const initParams = {
    offset:0,
    limit:20,
    filter:null,
}

const annotations = reactive({
    data:[],
    count:0
})

const params = reactive({...initParams})

const initAnnotation = {
    name:'',
    assembly_accession:'',
    gff_gz_location:'',
    tab_index_location:'',
    metadata:{}
}

const annotation = reactive({...initAnnotation})

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'GFF3 GZIP', key:'gff_gz_location', mandatory:true},
    {type:'input',label:'GFF3 TABIX GZIP', key:'tab_index_location', mandatory:true},
]

onMounted(()=>{
    annotationsProvider()
})

function handleAssembly(isValidAssembly){
    
}

function annotationsProvider(){
    DataPortalService.getAnnotations(params)
    .then(resp => {
        annotations.data = [...resp.data.data]
        annotations.count = resp.data.total
    })
}

watch(params,()=>{
    annotationsProvider()
})

function editAnnotation(annotationItem){
    Object.assign(annotation,annotationItem)
}

function confirmDeleteAnnotation(name){
    selectedAnnotation.value = name
    showModal.value = true
}

function deleteAnnotation(){
    SubmissionService.deleteAnnotation
}

function clearDeleteSelection(){
    selectedAnnotation.value = ''
    showModal.value = false
}
</script>
