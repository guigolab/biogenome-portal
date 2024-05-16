<template>
  <div style="padding-left: 10px;" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <h2 class="va-h2">{{ country.name }}</h2>
      <p class="va-text-secondary">{{ country.id }}</p>
      <VaDivider />
      <ItemsBlock :countries="country.id" :key="country.id" :columns="models.organisms.columns"
        :filters="(models.organisms.filters as Filter[])" :model="'organisms'" />
    </div>
  </div>
</template>
<script setup lang="ts">
import ItemsBlock from '../../pages/common/components/ItemsBlock.vue'
import { models } from '../../../config.json'
import { Filter } from '../../data/types'

const props = defineProps<{
  country: {
    id: string
    name: string
  }
}>()

</script>