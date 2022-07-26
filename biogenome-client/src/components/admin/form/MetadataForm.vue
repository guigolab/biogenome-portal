<template>
    <va-card>
        <va-card-content>
            <div class="row">
                <div class="flex">
                    <va-input
                        v-model="metadataKey"
                        label="Attribute Name"
                    />
                </div>
                <div class="flex">
                    <va-input
                        v-model="metadataValue"
                        label="Attribute value"
                    />
                </div>
            </div>
        </va-card-content>
        <va-card-actions>
            <va-button :disabled="!metadataKey && !metadataValue" @click="addMetadataAttribute()">Add Attribute</va-button>
        </va-card-actions>
    </va-card>
</template>
<script setup>
import {ref} from "vue"

const props = defineProps({
    metadata:Object
})

const metadataKey = ref("")
const metadataValue = ref("")

function addMetadataAttribute(){
    props.metadata[metadataKey.value] = metadataValue.value
    metadataKey.value = ""
    metadataValue.value = ""
}
</script>