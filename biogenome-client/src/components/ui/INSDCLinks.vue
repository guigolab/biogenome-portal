<template>
  <div class="row row-equal align-center">
    <div class="flex">
      <a target="_blank" :href="url">
        <va-avatar size="large">
          <img :src="'/ncbi.png'" />
        </va-avatar>
      </a>
    </div>
    <div class="flex">
      <a target="_blank" :href="url">
        <va-avatar size="large">
          <img :src="'/ena.jpeg'" />
        </va-avatar>
      </a>
    </div>
  </div>
</template>
<script setup lang="ts">
  const props = defineProps({
    url: String,
  })
</script>
