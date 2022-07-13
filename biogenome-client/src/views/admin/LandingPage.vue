<template>
    <div class="layout">
        <div class="row">
            <va-alert :color="alert.color" v-model="showAlert" closeable>
                {{alert.message}}
            </va-alert>
        </div>
        <div class="row">
            <div class="flex">
                <va-tabs v-model="dataValue" style="width: 250px;">
                    <template #tabs>
                        <va-tab
                            v-for="model in dataModels"
                            :name="model.value"
                            :key="model.value"
                        >
                            {{ model.label }}
                        </va-tab>
                    </template>
                </va-tabs>
            </div>
        </div>
        <div v-if="showTable" class="row">
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
                    <div class="row justify--space-betwenn">
                        <div v-if="selectedModelObject && selectedModelObject.editable" class="flex">
                            <va-button @click="editItem(rowData)" icon="edit"/>
                        </div>
                        <div class="flex">
                            <va-button color="danger" @click="confirmDeleteItem(rowData)" icon="delete"/>
                        </div>
                    </div>
                </template>
                <template #cell(sub_samples)="{ rowData }">
                    <div class="row align--center">
                        <div class="flex">
                            <va-button-dropdown v-if="rowData.sub_samples && rowData.sub_samples.length" size="small" flat>
                                <ul>
                                    <li v-for="acc in rowData.sub_samples" :key="acc">
                                        <a class="link">{{acc}}</a>
                                    </li>
                                </ul>
                            </va-button-dropdown>
                        </div>
                    </div>
                </template>
                    <template #headerAppend>
                        <tr style="background-color:white">
                            <th>
                                <Pagination
                                    :total="loadedItems.count"
                                    :query="params"
                                />
                            </th>
                        </tr>
                    </template>
                </va-data-table>
                <va-modal v-model="showDeleteModal" hide-default-actions>
                    <div>{{`Are you sure you want to delete ${idToDelete} and its related data from ${dataValue}? This action is irreversible`}}</div>
                        <template #footer>
                            <div class="row justify--space-between">
                                <div class="flex">
                                    <va-button @click="resetDeleteAction()"  color="info">
                                        Cancel Action
                                    </va-button>
                                </div>
                                <div class="flex">
                                    <va-button @click="deleteItem()" color="danger">
                                        Delete {{idToDelete}}
                                    </va-button>
                                </div>
                            </div>                            
                        </template>
                </va-modal>
                <va-modal v-model="showEditModal" hide-default-actions>
                        <FormComponent 
                            :title="objectToEdit.title"
                            :form-options="objectToEdit.formOptions"
                            :list-object="objectToEdit.listObject"
                        />
                        <template #footer>
                            <div class="row justify--space-between">
                                <div class="flex">
                                    <va-button @click="resetEditAction()"  color="info">
                                        Cancel Action
                                    </va-button>
                                </div>
                                <div class="flex">
                                    <va-button @click="submitEditedItem()" color="danger">
                                        update {{idToDelete}}
                                    </va-button>
                                </div>
                            </div>                            
                        </template>
                </va-modal>
            </div>
        </div>
    </div>
</template>
<script setup>
import AnnotationService from '../../services/AnnotationService'
import AssemblyService from '../../services/AssemblyService'
import BioSampleService from '../../services/BioSampleService'
import LocalSampleService from '../../services/LocalSampleService'
import ReadService from '../../services/ReadService'
import OrganismService from '../../services/OrganismService'
import UserService from '../../services/UserService'
import Pagination from '../../components/Pagination.vue'
import FormComponent from '../../components/admin/form/FormComponent.vue'
import {computed, nextTick, onMounted, reactive, ref, watch} from 'vue'
import {useRouter} from 'vue-router'

const router = useRouter()

const dataValue = ref('organisms')

const showAlert = ref(false)

const initAlert = {
    color:'',
    message:''
}
const alert = reactive({...initAlert})

const initObjectToEdit = {
    title:'',
    listObject:null,
    formOptions: [],
}

const objectToEdit = reactive({...initObjectToEdit})

const idToDelete = ref('')

const showTable = ref(false)
const showDeleteModal = ref(false)
const showEditModal = ref(false)

const initParams = {
    offset:0,
    limit:20,
    filter:null,
}

const initLoadedItems = {
    data:null,
    columns:[],
    total:0
}

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'GFF3 GZIP', key:'gff_gz_location', mandatory:true},
    {type:'input',label:'GFF3 TABIX GZIP', key:'tab_index_location', mandatory:true},
]
const assemblyTrackOptions = [
    {type:'input',label:'Fasta location', key:'fasta_location', mandatory:true},
    {type:'input',label:'fai location', key:'fai_location', mandatory:true},
    {type:'input',label:'gzi Location', key:'gzi_location', mandatory:true},
    {type:'input',label:'chromosome aliases file url', key:'chrom_alias'},
]

const selectedModelObject = computed(()=>{
    return dataModels.find(model => model.value === dataValue.value)
})

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
    columns:['scientific_name','taxid','tolid_prefix','actions'], deleteAction: OrganismService.deleteOrganism,editable:true},
    {label:'BioSamples',value:'biosamples', itemProvider: BioSampleService.getBioSamples,
    columns:['accession','taxid','sub_samples','actions'],deleteAction: BioSampleService.deleteBioSample,editable:false},
    {label:'Reads',value:'reads', itemProvider: ReadService.getReads,
    columns:['experiment_accession','instrument_platform','taxid','actions'],deleteAction: ReadService.deleteReads,editable:false},
    {label:'Assemblies',value:'assemblies', itemProvider: AssemblyService.getAssemblies,
    columns:['accession','assembly_name','taxid','actions'],deleteAction: AssemblyService.deleteAssembly,editable:true},
    {label:'Annotations',value:'annotations', itemProvider: AnnotationService.getAnnotations,
    columns:['name','assembly_accession','actions'],deleteAction: AnnotationService.deleteAnnotation,editable:true},
    {label:'Local samples',value:'local_samples', itemProvider: LocalSampleService.getLocalSamples,
    columns:['local_id','taxid','broker','actions'], deleteAction: LocalSampleService.deleteLocalSample,editable:true},
    {label:'Portal Users',value:'users', itemProvider: UserService.getUsers,
    columns:['name','role','actions'],editable:true}
]

const initAssemblyTrack = {
    fasta_location : null,
    fai_location: null,
    gzi_location: null,
    chrom_alias: null
}

function getData(){
    dataModels.forEach(m => {
        if(m.value === dataValue.value){
            m.itemProvider(params)
            .then(resp => {
                console.log(resp)
                nextTick(()=>{
                    loadedItems.data = resp.data.data
                    loadedItems.total = resp.data.total
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

//edit assembly track or annotation track
function editItem(item){
    if(dataValue.value === 'assemblies'){
        objectToEdit.title = item.accession
        objectToEdit.listObject = item.track || initAssemblyTrack
        objectToEdit.formOptions = assemblyTrackOptions
        showEditModal.value = true
    }else if(dataValue.value === 'annotations'){
        objectToEdit.title = item.name
        objectToEdit.listObject = item
        objectToEdit.formOptions = annotationOptions
        showEditModal.value = true
    }else if(dataValue.value === 'organisms'){
        router.push({name: 'organism-form', params:{taxid: item.taxid}})
    }
}

function resetEditAction(){
    Object.assign(objectToEdit,initObjectToEdit)
    showEditModal.value = false
}

function submitEditedItem(){
    if(dataValue.value === 'assemblies'){
        AssemblyService.updateAssembly(objectToEdit.title, objectToEdit.listObject)
        .then(resp => {
            console.log(resp)
        })
    }else if(dataValue.value === 'annotations'){
        AnnotationService.updateAnnotation(objectToEdit.title, objectToEdit.listObject)
        .then(resp => {
            console.log(resp)
        })
    }
}

function confirmDeleteItem(item){
    idToDelete.value = item.accession || item.name || item.local_id || item.experiment_accession || item.taxid
    showDeleteModal.value = true
}

function resetDeleteAction(){
    idToDelete.value=''
    showDeleteModal.value=false
}

function deleteItem(){
    dataModels.forEach(m => {
        if(m.value === dataValue.value){
            m.deleteAction(idToDelete.value)
            .then(resp => {
                showDeleteModal.value = false
                idToDelete.value = ''
                getData()
                alert.color = 'success'
                alert.message = `${resp.data} succesfully deleted`
                showAlert.value = true
            })
            .catch(e => {
                alert.color = 'danger'
                alert.message = e.message
                showAlert.value = true
            })
        }
    })
}
</script>