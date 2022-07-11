<template>
<va-card>
    <va-card-title>
        Create Annotation
    </va-card-title>
    <va-card-content>
        <ClientInput 
            :label="'Search Assembly accession'"
            :placeholder="'ex: GCA_905340225.1'"
            :request="NCBIClientService.getAssembly"
            @on-response="parseResponse"
        />
    </va-card-content>
    <va-divider/>
    <va-card-content>
        <FormComponent
            :title="'annotation form'"
            :listObject="annotation"
            :formOptions="annotationOptions"
        />
    </va-card-content>
    <va-card-actions>
        <va-button>Reset Annotation</va-button>
        <va-button>Submit Annotation</va-button>
    </va-card-actions>
</va-card>
</template>
<script setup>
import { reactive,ref } from "vue"
import FormComponent from './FormComponent.vue'
import NCBIClientService from "../../../services/clients/NCBIClientService"

const isValidAssembly = ref(false)

const isLoading = ref(false)

const initAnnotation = {
    name:'',
    assembly_accession:'',
    gff_gz_location:'',
    tab_index_location:'',
}

const annotation = reactive({...initAnnotation})

const initResponse = {
    organism_name:'',
    display_name:'',
    assembly_level:'',
}

const response = reactive({...initResponse})

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'GFF3 GZIP', key:'gff_gz_location', mandatory:true},
    {type:'input',label:'GFF3 TABIX GZIP', key:'tab_index_location', mandatory:true},
]

function getAssemblyFromNCBI(){
    isLoading.value=true
    //wait 1 second after each request to avoid being blocked
    if(requestCounter.value > 0){
        setTimeout(()=>1.0*1000)
        requestCounter.value = 0
    }
    NCBIClientService.getAssembly(annotation.assembly_accession)
    .then(resp => {
        requestCounter.value++
        if(resp.data && resp.data.total_count && resp.data.total_count >= 1){
            const assembly = resp.data.assemblies[0].assembly
            response.organism_name = assembly.org.sci_name
            response.display_name = assembly.display_name
            response.assembly_level = assembly.assembly_level
            isLoading.value=false
            isValidAssembly.value = true
        }else{
            isLoading.value=false
            isValidAssembly.value = false
            assemblyLoaded.value=false
        }
    })
    .catch(e => {
        requestCounter.value++
        console.log(e)
        isLoading.value=false
        isValidAssembly.value = false
        assemblyLoaded.value=false
    })
}
function parseResponse(value){
    if(value.isError){
        alert.message = `${value.id} not found`
        alert.color = 'danger'
        showAlert.value = true
        return
    }
    //get element in array
    if(value.response.data && value.response.data.assemblies.length){
        const assemblyToParse = value.response.data.assemblies[0].assembly
        const parsedAssembly = {}
        Object.keys(assemblyToParse)
        .forEach(k => {
            if(k === 'org'){
                parsedAssembly['taxid'] = assemblyToParse[k].tax_id
                parsedAssembly['scientific_name'] = assemblyToParse[k].sci_name
            }else{
                if(typeof assemblyToParse[k] === 'string'){
                    parsedAssembly[k] = assemblyToParse[k]
                }
            }
        })
        response.value = parsedAssembly
        assemblyToSubmit.accession = value.id
        isValidAssembly.value = true
    }
}
</script>