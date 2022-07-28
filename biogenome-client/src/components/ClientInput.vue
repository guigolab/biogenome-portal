<template>
    <va-inner-loading :loading="isLoading">
        <div class="row justify--space-between">
            <div class="flex">
                <va-input
                    :disabled="validData"
                    :label="props.label"
                    :placeholder="props.placeholder"
                    v-model="id"
                />
            </div>
            <div class="flex">
                <va-chip :disabled="!id || validData" @click="getData()" outline>Get Data</va-chip>
                <va-chip color="danger" @click="resetData()">Reset Data</va-chip>
            </div>
        </div>
    </va-inner-loading>
</template>
<script setup>
import {ref,defineEmits,reactive} from 'vue'

const emit = defineEmits(['onResponse','onReset'])

const isLoading = ref(false)

const props = defineProps({
    label:String,
    placeholder:String,
    insdcRequest:Promise,
    portalRequest:Promise,
    validData:Boolean
})

const id = ref('')

const initAlert = {
  title:'',
  message:'',
  color: ''
}

const alert = reactive({...initAlert})

function getData(){
    isLoading.value = true
    props.portalRequest(id.value)
    .then(resp => {
        if(resp && resp.data){
            alert.title="Error"
            alert.message=`${props.label} with id: ${id.value} is already present`
            alert.color="danger"
            isLoading.value=false
            emit('onResponse', {data:resp.data, isError:true, alert:alert, id:id.value})
        }
    })
    .catch(e => {
        isLoading.value=false
        if(e && e.response && e.response.status && e.response.status === 404){
            return props.insdcRequest(id.value)
        }
        return null
    })
    .then(resp => {
        isLoading.value=false
        if(resp && resp.data){
            emit('onResponse', {data:resp.data, isError:false,alert:alert, id:id.value})
        }
    })
    .catch(e => {
        alert.title="Error"
        alert.message=`${props.label} with id: ${id.value} not found in INSDC`
        alert.color="danger"
        isLoading.value=false
        emit('onResponse', {data:resp.data, isError:true,alert:alert, id:id.value})
    })
}
function resetData(){
    id.value=""
    emit('onReset')
}


</script>