<template>
  <VaCarousel
    v-model="value"
    :items="images"
    :ratio="16 / 12"
  />
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
    images: string[]
}>()

const value = ref(0)

</script>
<style lang="scss" scoped>

</style>