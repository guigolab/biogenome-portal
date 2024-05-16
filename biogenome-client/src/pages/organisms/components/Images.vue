<template>
  <VaCarousel
    v-model="value"
    :items="images"
    :ratio="16 / 12"
  />
</template>
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
    images: string[]
}>()

const value = ref(0)

</script>
<style lang="scss" scoped>

</style>