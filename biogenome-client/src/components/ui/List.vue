<template>
  <!-- <va-card>
    <va-card-title>
      {{ title }}
    </va-card-title>
    <va-card-content class="list-scroller"> -->
  <va-list>
    <va-list-item v-for="(item, index) in list" :key="index" class="list__item">
      <va-list-item-section>
        <va-list-item-label>
          <va-chip :to="{ name: route, params: { accession: item } }" flat> {{ item }}</va-chip>
        </va-list-item-label>
      </va-list-item-section>
    </va-list-item>
  </va-list>
  <!-- </va-card-content>
  </va-card> -->
</template>
<script setup lang="ts">
  const props = defineProps({
    title: String,
    list: Array,
    route: String,
  })
</script>
<style>
  .list-scroller {
    max-height: 200px;
    overflow: scroll;
  }
</style>
