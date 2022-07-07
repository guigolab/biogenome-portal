<template>
    <va-inner-loading
    :loading="isLoading"
    >
        <va-input 
            :label="props.label"
            :placeholder="props.placeholder"
            v-model="props.id"
        >
            <template #append>
                <va-chip :disabled="!props.id" @click="getData()" outline>Get Data</va-chip>
            </template>
        </va-input>
    </va-inner-loading>
</template>
<script setup>
import {ref} from 'vue'

const isLoading = ref(false)

const props = defineProps({
    id:String,
    label:String,
    placeholder:String,
    request:Object,
})

function getData(){
    isLoading.value = true
    props.request(props.id)
    .then(resp => {
        console.log(resp)
        isLoading.value=false
    })
    .catch(e => {
        console.log(e)
        isLoading.value = false
    })
}

</script>