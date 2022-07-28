<template>
    <va-card class="custom-card">
        <va-card-content>
            <ul>
                <li v-for="(key,index) in Object.keys(metadata)" :key="index">
                    <div class="row justify--space-evenly align--center">
                        <div style="text-align:center" class="flex">
                            <p><strong>{{key}}</strong>:</p>
                            <p>{{metadata[key]}}</p>
                        </div>
                        <div class="flex">
                            <p><va-icon name="edit" @click="editAttribute(key)"/><va-icon name="delete" @click="deleteAttribute(key)"/></p>
                        </div>
                    </div>
                    <va-divider/>
                </li>
            </ul>
        </va-card-content>
        <va-card-content>
            <div class="row justify--space-between">
                <div class="flex">
                    <va-input
                        v-model="metadataKey"
                        label="Attribute Name"
                    />
                </div>
                <div class="flex">
                    <va-input
                        v-model="metadataValue"
                        type="textarea"
                        label="Attribute value"
                        autosize
                    />
                </div>
            </div>
        </va-card-content>
        <va-card-actions>
            <va-button :disabled="!metadataKey && !metadataValue" @click="addAttribute()">Add Attribute</va-button>
        </va-card-actions>
    </va-card>
</template>
<script setup>
import {ref} from "vue"

const props = defineProps({
    metadata:Object,
})

const metadataKey = ref("")
const metadataValue = ref("")

function addAttribute(){
    props.metadata[metadataKey.value] = metadataValue.value
    metadataKey.value = ""
    metadataValue.value = ""
}

function editAttribute(key){
    metadataKey.value=key
    metadataValue.value=props.metadata[key]
}
function deleteAttribute(key){
    delete props.metadata[key]
}
</script>