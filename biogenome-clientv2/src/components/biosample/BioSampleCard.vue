<template>
  <va-card>
    {{ data }}
  </va-card>
</template>
<script setup lang="ts">
  import BioSampleService from '../../services/clients/BioSampleService'

  const props = defineProps({
    accession: String,
  })

  const { data } = await BioSampleService.getBioSample(props.accession)
</script>
