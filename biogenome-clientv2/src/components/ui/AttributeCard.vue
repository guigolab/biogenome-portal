<template>
  <va-card class="mb-4" :color="color">
    <va-card-content>
      <h2 class="va-h4 ma-0" style="color: white">{{ title }}</h2>
      <p style="color: white">{{ text }}</p>
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
  const props = defineProps({
    color: String,
    title: String,
    text: String,
  })
</script>
