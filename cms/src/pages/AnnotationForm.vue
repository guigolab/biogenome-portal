<template>
  <Header :title="title" :description="description"/>
  <va-inner-loading :loading="isLoading">
    <div v-if="!name">
      <NameInput />
      <AssemblyInput />
    </div>
    <FileForm :name="name" @on-loading="(v) => isLoading = v" />
  </va-inner-loading>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import NameInput from '../components/NameInput.vue'
import AssemblyInput from '../components/AssemblyInput.vue'
import FileForm from '../components/FileForm.vue'
import Header from '../components/Header.vue'

const props = defineProps<{
  name?: string
}>()

const title = "Annotation Form"
const description = computed(() => props.name ? `Edit ${props.name}` : 'Create a new annotation')

const isLoading = ref(false)

</script>
