<template>
    <va-card class="custom-card">
        <va-card-title>
            {{title}}
        </va-card-title>
        <va-card-content>
            <va-button-dropdown outline :color="color" v-for="(model,index) in modelList" :key="index" :label="model[keyLabel]">
                <ul>
                    <li>
                        <va-chip icon="edit" @click="editObject(index)" flat>Edit</va-chip>
                    </li>
                    <li>
                        <va-chip icon="delete" @click="deleteObject(index)" flat>Remove</va-chip>
                    </li>
                </ul>
            </va-button-dropdown>
        </va-card-content>
        <va-card-content>
            <div v-for="(inputOpt,index) in formOptions"
                :key="index"
            >
                <div v-if="inputOpt.type === 'input'">
                    <va-input
                        v-model="reactiveObj[inputOpt.key]"
                        :label="inputOpt.label"
                        :messages="inputOpt.messages"
                        :error="inputOpt.mandatory && !reactiveObj[inputOpt.key]"
                    />
                </div>
                <div v-else-if="inputOpt.type === 'select'">
                    <va-select
                        :label="inputOpt.label"
                        :options="inputOpt.options"
                        v-model="reactiveObj[inputOpt.key]"
                    />
                </div>
            </div>
            <va-button :disabled="invalidItem" @click="saveObject()">Save Item</va-button>
        </va-card-content>
    </va-card>
</template>
<script setup>
import { computed, reactive } from "vue"

const props = defineProps({
    color:String,
    title:String,
    keyLabel:String,
    listObject:Object,
    modelList:Array,
    formOptions:Array
})

const invalidItem = computed(()=>{
    return props.formOptions.filter(f => f.mandatory).filter(f => !reactiveObj[f.key]).length
})

const reactiveObj = reactive({...props.listObject})

function saveObject(){
    props.modelList.push({...reactiveObj})
    Object.assign(reactiveObj,props.listObject)
}

function editObject(index){
    Object.assign(reactiveObj, props.modelList[index])
    props.modelList.splice(index,1)
}
function deleteObject(index){
    props.modelList.splice(index,1)
    
}
</script>