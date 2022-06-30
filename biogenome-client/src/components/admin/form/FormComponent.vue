<template>
    <va-card class="custom-card">
        <va-card-title>
            {{title}}
        </va-card-title>
        <va-card-content>
            <div v-for="(inputOpt,index) in formOptions"
                :key="index"
            >
                <div v-if="inputOpt.type === 'input'">
                    <va-input
                        v-model="listObject[inputOpt.key]"
                        :label="inputOpt.label"
                        :messages="inputOpt.messages"
                        :error="inputOpt.mandatory && !listObject[inputOpt.key]"
                    />
                </div>
                <div v-else-if="inputOpt.type === 'select'">
                    <va-select
                        :label="inputOpt.label"
                        :options="inputOpt.options"
                        v-model="listObject[inputOpt.key]"
                    />
                </div>
                <div v-else-if="inputOpt.type === 'textarea'">
                    <va-input
                        v-model="listObject[inputOpt.key]"
                        type="textarea"
                        autosize
                        :label="inputOpt.label"
                        :messages="inputOpt.messages"
                        :error="inputOpt.mandatory && !listObject[inputOpt.key]"
                    />
                </div>
            </div>
        </va-card-content>
    </va-card>
</template>
<script setup>
import { reactive } from "vue"

const props = defineProps({
    color:String,
    title:String,
    listObject:Object,
    formOptions:Array
})



</script>