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
                v-model="accession"
                :disabled="assemblyLoaded"
            >
                <template #append>
                    <va-chip :disabled="!accession" @click="getAssemblyFromNCBI()" outline>Get Assembly</va-chip>
                </template>
            </va-input>
        </va-inner-loading>
    </va-card-content>
</va-card>
</template>
<script setup>
import { reactive } from "vue"
import FormComponent from './FormComponent.vue'

const annotation = reactive({
    name:'',
    targetGenome:'',
    gffGzLocation:'',
    tabIndexLocation:'',
    evidenceSource:'',
    lengthTreshold:'',

})

const annotationOptions = [
    {type:'input',label:'Name', key:'name', mandatory:true},
    {type:'input',label:'Target genome', key:'targetGenome', mandatory:true},
    {type:'input',label:'GFF3 GZIP', key:'gffGzLocation', mandatory:true},
    {type:'input',label:'GFF3 TABIX GZIP', key:'tabIndexLocation', mandatory:true},
]
</script>