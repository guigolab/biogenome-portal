<template>
    <div style="height:100vh" class="layout">
        <div class="row">
            <va-alert :color="alert.color" v-model="showAlert" closeable>
                {{alert.message}}
            </va-alert>
        </div>
        <div class="row justify--space-evenly">
            <div class="flex lg12 md12 sm12 xs12">
                <va-tabs v-model="dataValue" >
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
        <va-divider/>
        <div v-if="showTable" class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <va-data-table
                    sticky-header
                    :style="{
                        '--va-data-table-scroll-table-height': '66vh',
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
                    <div class="row justify--space-evenly">
                        <div class="flex">
                            <va-button @click="showDetails(rowData)" icon="search"/>
                        </div>
                        <div v-if="selectedModelObject && selectedModelObject.editable" class="flex">
                            <va-button @click="editItem(rowData)" icon="edit"/>
                        </div>
                        <div v-if="dataValue === 'assemblies'">
                            <va-button-dropdown
                                icon="more_vert"
                                flat
                            >
                            <ul>
                                <li>
                                    <va-button flat icon="query_stats" :to="{name:'annotation-form', params:{accession:rowData.accession,toUpdate:false}}">Add Annotation</va-button>
                                </li>
                                <li>
                                    <va-button flat icon="view_timeline" :to="{name:'genome-browser-form', params:{accession:rowData.accession,toUpdate:false}}">Add Genome Browser Data</va-button>
                                </li>
                            </ul>
                            </va-button-dropdown>
                        </div>
                        <div v-if="isAdmin" class="flex">
                            <va-button :disabled="loggedUser && loggedUser === rowData.name"  color="danger" @click="confirmDeleteItem(rowData)" icon="delete"/>
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
                        <th v-if="dataValue === 'users'" colspan="1">
                            <va-button @click="openUserForm()">
                                Create new user
                            </va-button>
                        </th>
                        <th colspan="1">
                            <Pagination
                                :total="loadedItems.total"
                                :query="params"
                            />
                        </th>
                    </tr>
                </template>
                </va-data-table>
                <va-modal v-model="showItemDetails">
                    <va-divider>Attributes</va-divider>
                    <ul>
                        <li style="padding:10px" v-for="obj in objectToShow.fields" :key="obj.key">
                            <div v-if="Array.isArray(obj.value)">
                                <strong>{{obj.key+ ': '}}</strong>
                                <ul >
                                    <li class="data-attribute" v-for="(el,index) in obj.value" :key="index">
                                        {{el}}
                                    </li>
                                </ul>
                            </div>
                            <div v-else>
                                <strong>{{obj.key+ ': '}}</strong>{{obj.value}}
                            </div>
                        </li>
                    </ul>
                    <va-divider v-if="objectToShow.metadata && objectToShow.metadata.length">Metadata</va-divider>
                    <ul v-if="objectToShow.metadata && objectToShow.metadata.length">
                        <li style="padding:10px" v-for="obj in objectToShow.metadata" :key="obj.key">
                            <div v-if="Array.isArray(obj.value)">
                                <strong>{{obj.key+ ': '}}</strong>
                                <ul>
                                    <li class="data-attribute" v-for="(el,index) in obj.value" :key="index">
                                        {{el}}
                                    </li>
                                </ul>
                            </div>
                            <div v-else>
                                <strong>{{obj.key+ ': '}}</strong>{{obj.value}}
                            </div>
                        </li>
                    </ul>
                </va-modal>
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
                <va-modal v-model="showCreateUserModal" hide-default-actions>
                    <FormComponent 
                        :title="objectToEdit.title"
                        :form-options="objectToEdit.formOptions"
                        :list-object="objectToEdit.listObject"
                    />
                    <template #footer>
                        <div class="row justify--space-between">
                            <div class="flex">
                                <va-button @click="resetUser()"  color="info">
                                    Cancel
                                </va-button>
                            </div>
                            <div class="flex">
                                <va-button @click="submitUser()" color="danger">
                                    Submit
                                </va-button>
                            </div>
                        </div>                            
                    </template>
                </va-modal>
                <va-modal v-model="showEditModal" hide-default-actions>
                <div v-if="dataValue==='annotations'">

                </div>
                <div v-else-if="dataValue==='jbrowse'">

                </div>
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
                                        update
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
import GenomeBrowserService from '../../services/GenomeBrowserService'
import Pagination from '../../components/Pagination.vue'
import FormComponent from '../../components/admin/form/FormComponent.vue'
import {computed, nextTick, onMounted, reactive, ref, watch} from 'vue'
import {useRouter} from 'vue-router'


//should split code page

const router = useRouter()

const dataValue = ref('organisms')

const showItemDetails = ref(false)

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
const showCreateUserModal = ref(false)

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

const initUser = {
    name:'',
    password:'',
    role:'SampleCollector'
}



const user = reactive({...initUser})

const userOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'Password', key:'password', mandatory:true},
    {type:'select',label:'Role',options:['SampleManager','DataManager','Admin'], key:'role', mandatory:true},
]

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'GFF3 GZIP', key:'gff_gz_location', mandatory:true},
    {type:'input',label:'GFF3 TABIX GZIP', key:'tab_index_location', mandatory:true},
]



const selectedModelObject = computed(()=>{
    return dataModels.find(model => model.value === dataValue.value)
})

const objectToShow = reactive({
    fields:[],
    metadata:[]
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

const isAdmin = computed(()=>{
    const role = localStorage.getItem('userRole')
    return role === 'Admin'
})

const loggedUser = computed(()=>{
    return localStorage.getItem('userName')
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
    columns:['accession','assembly_name','taxid','actions'],deleteAction: AssemblyService.deleteAssembly,editable:false},
    {label:'Annotations',value:'annotations', itemProvider: AnnotationService.getAnnotations,
    columns:['name','assembly_accession','actions'],deleteAction: AnnotationService.deleteAnnotation,editable:true},
    {label:'Local samples',value:'local_samples', itemProvider: LocalSampleService.getLocalSamples,
    columns:['local_id','taxid','broker','actions'], deleteAction: LocalSampleService.deleteLocalSample,editable:false},
    {label:'Genome Browser Data',value:'jbrowse', itemProvider: GenomeBrowserService.getGenomeBrowserData ,deleteAction: GenomeBrowserService.deleteGenomeBrowserData, columns:['assembly_accession','taxid','actions'], editable:true},
    {label:'Portal Users',value:'users', itemProvider: UserService.getUsers,deleteAction: UserService.deleteUser,columns:['name','role','actions'],editable:true}
]

const filteredDataModels = computed(()=>{
    const role = localStorage.getItem('userRole')
    switch(role){
        case 'Admin':
            return dataModels
        case 'SampleManager':
            return dataModels.filter(dt => dt.value === 'local_samples' || dt.value === 'biosamples')
        case 'DataManager':
            return dataModels.filter(dt => dt.value !== 'users')
    }
})

function showDetails(item){
    objectToShow.fields = Object.keys(item)
    .filter(k => k !== 'metadata')
    .map(k => {
        return {key: k, value: item[k]}
    })
    if(item.metadata){
        objectToShow.metadata = Object.keys(item.metadata)
        .map(k => {
            return {key: k, value: item.metadata[k]}
        })
    }
    showItemDetails.value = true
}

function openUserForm(){
    objectToEdit.title = 'New user'
    objectToEdit.formOptions = userOptions
    objectToEdit.listObject = user
    showCreateUserModal.value = true
}

function submitUser(){
    UserService.createUser(user)
    .then(resp => {
        resetUser()
        getData()
    })
    .catch(e => {
        console.log(e)
        showCreateUserModal.value = false
    })
}

function resetUser(){
    Object.assign(user,initUser)
    showCreateUserModal.value = false
}


function getData(){
    dataModels.forEach(m => {
        if(m.value === dataValue.value){
            m.itemProvider(params)
            .then(resp => {
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
    switch(dataValue.value){
        case 'annotations':
            router.push({name:'annotation-form', params:{accession:item.assembly_accession,toUpdate:true,name:item.name}})
            break
        case 'jbrowse':
            router.push({name:'genome-browser-form', params:{accession:item.accession,toUpdate:true}}) //genome browser data share the same assembly accession
            break
        case 'organisms':
            router.push({name: 'organism-form', params:{taxid: item.taxid}})
            break
        case 'users':
            objectToEdit.title = item.name
            objectToEdit.listObject = item
            objectToEdit.formOptions = userOptions.filter(opt => opt.key !== 'name') // can't edit the name
            showEditModal.value = true
            break
    }
}

function resetEditAction(){
    Object.assign(user,initUser)
    Object.assign(objectToEdit,initObjectToEdit)
    showEditModal.value = false
}

function submitEditedItem(){
    if(dataValue.value === 'users'){
            UserService.updateUser(objectToEdit.title, objectToEdit.listObject)
            .then(resp => {
                console.log(resp)
            })
        }
    }

function confirmDeleteItem(item){
    idToDelete.value = item.accession || item.name || item.local_id || item.experiment_accession || item.assembly_accession || item.taxid
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
<style scoped>
li.data-attribute{
    list-style: circle;
}
</style>