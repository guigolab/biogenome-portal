<template>
    <div class="layout">
        <div class="row">
            <div class="flex">
                <va-button-dropdown label="Import data from INSDC">
                    <ul>
                        <li v-for="(action,index) in importActions" :key="index">
                            {{action.label}}
                        </li>
                    </ul>
                </va-button-dropdown>
                <va-button-dropdown label="Create local data">
                    <ul>
                        <li v-for="(action,index) in creationActions" :key="index">
                            {{action.label}}
                        </li>
                    </ul>
                </va-button-dropdown>
            </div>
        </div>
        <div class="row">
            <div class="flex">
                <va-data-table
                    sticky-header
                    :style="{
                        '--va-data-table-scroll-table-height': '300px',
                        '--va-data-table-scroll-table-color': '#2c82e0',
                    }"
                    :items="assemblies.data"
                    :columns="['accession','assembly_name','scientific_name','actions']"
                    :hoverable="true"
                >
                <template #header(actions)>
                    <va-input
                        label="filter"
                        v-model="params.filter"
                        />
                </template>
                <template #cell(actions)="{ rowData }">
                    <va-button @click="editAssembly(rowData)" icon="edit"/>
                    <va-button v-if="rowData.auto_imported === false" @click="deleteAssembly(rowData)" icon="delete"/>
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
            </div>
        </div>
    </div>
</template>
<script setup>
import DataPortalService from '../services/DataPortalService'
import AnnotationService from '../services/AnnotationService'
import AssemblyService from '../services/AssemblyService'
import BioSampleService from '../services/BioSampleService'
import LocalSampleService from '../services/LocalSampleService'
import ReadService from '../services/ReadService'
import OrganismService from '../services/OrganismService'
import SubmissionService from '../services/SubmissionService'
import {reactive,ref} from 'vue'

const dataValue = ref('organisms')

const initParams = {
    offset:0,
    limit:20,
    filter:null,
}

const initLoadedItems = {
    data:null,
    count:0
}

const loadedItems = reactive({...initLoadedItems})

const params = reactive({...initParams})

const dataModels = [
    {model:'organisms', itemProvider: OrganismService.getOrganisms},
    {model:'biosamples', itemProvider: BioSampleService.getBioSamples},
    {model:'reads', itemProvider: ReadService.getExperiments},
    {model:'assemblies', itemProvider: AssemblyService.getAssemblies},
    {model:'annotations', itemProvider: AnnotationService.getAnnotations},
    {model:'local_samples', itemProvider: LocalSampleService.getLocalSamples},
    {model:'users', itemProvider: UserService.getUsers}
]

const importActions = [
    {label:'Biosample from EBI biosamples'},
    {label:'Organism from NCBI biosamples'},
    {label:'Assembly from NCBI biosamples'},
    {label:'Reads from ENA portal'},
]

const creationActions = [
    {label:'Create organism', path:'/organism-form'},
    {label:'Create annotation track'},
    {label:'Create assembly track'},
    {label:'Import samples from spreadsheet'},
]

function getData()
    dataModels.forEach(m => {
        if(m.model === dataValue.value){
            m.itemProvider(params)
            .then(resp => {
                console.log(resp)
            })
        }
    })
// const editableModel = [
//     {model:'local_samples',},
//     'organisms',
//     'assemblies',//assembly track
//     'annotations',
//     'users'
// ]

</script>