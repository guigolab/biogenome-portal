<template>
    <va-inner-loading
        :loading="isLoading"
    >
        <va-input 
            :label="props.label"
            :placeholder="props.placeholder"
            v-model="id"
        >
            <template #append>
                <va-chip :disabled="!id" @click="getData()" outline>Get Data</va-chip>
            </template>
        </va-input>
    </va-inner-loading>
</template>
<script setup>
import {ref,defineEmits} from 'vue'

const emit = defineEmits(['onResponse'])

const isLoading = ref(false)

const props = defineProps({
    label:String,
    placeholder:String,
    request:Object,
})

const id = ref('')

function getData(){
    isLoading.value = true
    props.request(id.value)
    .then(resp => {
        console.log(resp)
        isLoading.value=false
        const isError = resp.status !== 200 ? true : false
        emit('onResponse', {response:resp, isError:isError, id:id.value})
    })
    .catch(e => {
        console.log(e)
        isLoading.value = false
        emit('onResponse', {response:e, isError:true, id:id.value})
    })
}

</script>