<template>
  <h4 class="va-h4">Annotation Form</h4>
  <p class="mb-4">{{ name ? `Edit ${name}` : 'Create a new annotation' }}</p>
  <va-inner-loading :loading="isLoading">
    <NameInput v-if="!name" />
    <AssemblyInput />
    <FileForm :name="name" @on-loading="(v) => isLoading = v" />
  </va-inner-loading>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import NameInput from './components/NameInput.vue'
import AssemblyInput from './components/AssemblyInput.vue'
import FileForm from './components/FileForm.vue'

const props = defineProps<{
  name?: string
}>()

const isLoading = ref(false)

</script>
