<template>
   <CmsInput
      v-model="input"
      label="Annotation name"
      placeholder="Enter a unique annotation name"
      :loading="isLoading"
      :error="!isValid && input.length > 0"
      error-message="An annotation with this name already exists"
      required
      hint="Must be unique across all annotations"
   />
</template>

<script setup lang="ts">
   import { ref, watchEffect } from 'vue'
   import { useAnnotationStore } from '../../../stores/annotation-store'
   import CommonService from '../../../services/CommonService'
   import CmsInput from '../ui/CmsInput.vue'

   const input = ref('')
   const isValid = ref(true)
   const isLoading = ref(false)
   const annotationStore = useAnnotationStore()

   watchEffect(async () => {
      if (!input.value) { isValid.value = true; return }
      isLoading.value = true
      try {
         await CommonService.getItem('annotations', input.value)
         isValid.value = false
      } catch {
         isValid.value = true
         annotationStore.annotationForm.name = input.value
      } finally {
         isLoading.value = false
      }
   })
</script>
