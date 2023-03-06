<template>
  <div class="row align-center justify-center">
    <div class="flex">
      <va-pagination
        v-model="pOffset"
        :page-size="limit"
        :total="total"
        :visible-pages="3"
        buttons-preset="secondary"
        rounded
        gapped
        border-color="primary"
        @update:model-value="(value:number) => $emit('handlePagination', value)"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
  import { ref } from 'vue'
  const props = defineProps({
    total: Number,
    limit: Number,
    offset: Number,
    pageOffset: Number,
  })
  const pOffset = ref(props.pageOffset)
  const emits = defineEmits(['handlePagination'])
</script>
