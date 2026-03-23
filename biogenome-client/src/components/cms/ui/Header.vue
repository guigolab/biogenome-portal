<template>
   <div class="cms-page-header">
      <h1 class="cms-page-header__title">{{ title }}</h1>
      <p v-if="description" class="cms-page-header__desc">{{ description }}</p>
   </div>
</template>

<script setup lang="ts">
   defineProps<{
      title: string
      description?: string
   }>()
</script>
