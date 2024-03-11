<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-input :loading="isLoading" v-model="input" style="padding-bottom: 10px"
                label="Annotation name" placeholder="Insert a valid genome annotation name"
                :rules="[(v: string) => v.length > 0 || 'Value is mandatory', (v: string) => isValid || 'An annotation with this name already exists']">
            </va-input>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useToast } from 'vuestic-ui/web-components';
import AnnotationService from '../../../../services/clients/AnnotationService';
import { useAnnotationStore } from '../../../../stores/annotation-store';

const { init } = useToast()
const input = ref('')
const isValid = ref(true)
const isLoading = ref(false)
const annotationStore = useAnnotationStore()

watchEffect(async () => {
    try {
        const { data } = await AnnotationService.getAnnotation(input.value)
        isValid.value = false
    } catch {
        isValid.value = true
        annotationStore.annotationForm.name = input.value
    }
})

</script>