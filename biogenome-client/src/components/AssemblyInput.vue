<template>
    <va-card>
        <va-card-title>
            Search assembly from NCBI
        </va-card-title>
        <va-card-content>
            <va-inner-loading
            :loading="isLoading"
            >
                <va-input 
                    label="insert INSDC accession"
                    placeholder="ex: GCA_905340225.1"
                    v-model="accession"
                    :disabled="isValidAssembly"
                >
                    <template #append>
                        <va-chip :disabled="!accession" @click="getAssemblyFromNCBI()" outline>Get Assembly</va-chip>
                    </template>
                </va-input>
            </va-inner-loading>
        </va-card-content>
        <Transition>
            <va-card-title v-if="isValidAssembly">
                {{accession}}
            </va-card-title>
        </Transition>
        <Transition>
            <va-card-content v-if="isValidAssembly">
                <ul>
                    <li v-for="key in Object.keys(assemblyObj)" :key="key">
                        <div class="row justify--space-between">
                            <div class="flex">
                                <p class="title">{{key}}:</p>
                            </div>
                            <div class="flex">
                                <p class="text--secondary">{{assemblyObj[key]}}</p>
                            </div>
                        </div>
                        <va-divider/>
                    </li>
                </ul>
            </va-card-content>
        </Transition>
        <Transition>
            <va-card-actions v-if="isValidAssembly">
                <va-button @click="$emit('validAssembly', false)">Reset Selection</va-button>
                <va-button @click="$emit('validAssembly', true)">Confirm Selection</va-button>
            </va-card-actions>
        </Transition>
    </va-card>
</template>
<script setup>
import {reactive, ref} from "vue"
import NCBIClientService from "../services/clients/NCBIClientService"

const props = defineProps({
    accession:String,
})

const isLoading = ref(false)

const isValidAssembly = ref(false)

const requestCounter = ref(0)

const initAssemblyObj = {
    organism_name:'',
    display_name:'',
    assembly_level:''
}
const assemblyObj = reactive({...initAssemblyObj})

function getAssemblyFromNCBI(){
    isLoading.value=true
    //wait 1 second after each request to avoid being blocked
    if(requestCounter.value > 0){
        setTimeout(()=>1.0*1000)
        requestCounter.value = 0
    }
    NCBIClientService.getAssembly(props.accession)
    .then(resp => {
        requestCounter.value++
        if(resp.data && resp.data.total_count && resp.data.total_count >= 1){
            const assembly = resp.data.assemblies[0].assembly
            response.organism_name = assembly.org.sci_name
            response.display_name = assembly.display_name
            response.assembly_level = assembly.assembly_level
            isLoading.value = false
            isValidAssembly.value = true
        }else{
            isLoading.value = false
            isValidAssembly.value = false
        }
    })
    .catch(e => {
        requestCounter.value++
        console.log(e)
        isLoading.value = false
        isValidAssembly.value = false
    })
}

function resetSelection(){
    Object.assign(assemblyObj,initAssemblyObj)
    isValidAssembly.value = false
}

function confirmSelection(){

}
</script>