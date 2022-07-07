<template>
<va-card>
    <va-card-title>
        Create Annotation
    </va-card-title>
    <va-card-content>
        <va-inner-loading
            :loading="isLoading"
        >
            <va-input 
                label="Search Assembly accession"
                placeholder="ex: GCA_905340225.1"
                v-model="annotation.assembly_accession"
                :disabled="assemblyLoaded"
            >
                <template #append>
                    <va-chip :disabled="!annotation.assembly_accession" @click="getAssemblyFromNCBI()" outline>Get Assembly</va-chip>
                </template>
            </va-input>
        </va-inner-loading>
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
        <va-button>Reset Assembly</va-button>
        <va-button>Submit Assembly</va-button>
    </va-card-actions>
</va-card>
</template>
<script setup>
import { reactive,ref } from "vue"
import FormComponent from './FormComponent.vue'
import NCBIClientService from "../../../services/clients/NCBIClientService"

const isValidAssembly = ref(false)

const isLoading = ref(false)

const annotation = reactive({
    name:'',
    assembly_accession:'',
    gffGzLocation:'',
    tabIndexLocation:'',
    evidenceSource:'',
    lengthTreshold:'',
})

const initResponse = {
    organism_name:'',
    display_name:'',
    assembly_level:'',
}

const response = reactive({...initResponse})

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'Target genome', key:'targetGenome', mandatory:true},
    {type:'input',label:'GFF3 GZIP', key:'gffGzLocation', mandatory:true},
    {type:'input',label:'GFF3 TABIX GZIP', key:'tabIndexLocation', mandatory:true},
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
</script>