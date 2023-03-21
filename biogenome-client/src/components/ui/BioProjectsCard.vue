<template>
  <va-card>
    <va-card-title> bioprojects </va-card-title>
    <va-card-content>
      <div v-for="(bp, index) in bioprojects" :key="index" style="padding: 0.5rem">
        <b class="display-6">{{ bp.title }}</b>
        <p>
          <va-chip size="small" :to="{name:'bioproject', params:{accession:bp.accession}}" outline preset="secondary">{{ bp.accession }}</va-chip>
        </p>
      </div>
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
  const props = defineProps({
    bioprojects: Array,
  })
</script>
