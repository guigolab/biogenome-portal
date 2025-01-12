<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-input :loading="isLoading" v-model="input" class="pb-10" label="Annotation name"
                placeholder="Insert a valid genome annotation name"
                :rules="[(v: string) => v.length > 0 || 'Value is mandatory', (v: string) => isValid || 'An annotation with this name already exists']">
            </va-input>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useAnnotationStore } from '../stores/annotation-store';
import ItemService from '../services/ItemService';

const input = ref('')
const isValid = ref(true)
const isLoading = ref(false)
const annotationStore = useAnnotationStore()

watchEffect(async () => {
    try {
        await ItemService.getItem('annotations', input.value)
        isValid.value = false
    } catch {
        isValid.value = true
        annotationStore.annotationForm.name = input.value
    }
})

</script>