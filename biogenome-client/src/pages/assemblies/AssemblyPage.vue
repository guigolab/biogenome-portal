<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'assemblies' }" label="assemblies" />
    </va-breadcrumbs>
    <va-divider />
    <AssemblyInfoBlock />
    <AssemblyListBlock />
  </div>
</template>
<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import AssemblyInfoBlock from './AssemblyInfoBlock.vue'
  import AssemblyListBlock from './AssemblyListBlock.vue'

  const router = useRouter()
</script>

<style lang="scss">
  .chart {
    height: 400px;
  }
  .row-equal .flex {
    .va-card {
      height: 100%;
    }
  }
</style>
