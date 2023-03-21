<template>
  <va-collapse color="textInverted" flat>
    <template #header>
      <va-card-content>
        <div class="row justify-end align-center">
          <div class="flex">
            <va-button color="primary" icon="tune">Filters</va-button>
          </div>
        </div>
      </va-card-content>
    </template>
    <va-form tag="form" @submit.prevent="$emit('onSubmit')">
      <va-card-content>
        <div class="row align-center justify-start">
          <div v-for="(filter, index) in filters" :key="index" class="flex lg4 md4 sm12 xs12">
            <div v-if="filter.type === 'input'">
              <va-input v-model="sForm[filter.key]" :label="filter.label" :placeholder="filter.placeholder" />
            </div>
            <div v-else-if="filter.type === 'select'">
              <va-select v-model="sForm[filter.key]" :label="filter.label" :options="filter.options" />
            </div>
            <div v-else>
              <va-date-input
                v-model="dateRange"
                :format-date="(date:Date) => date.toISOString().substring(0,10)"
                label="Date"
                placeholder="select a date range"
                style="width: 100%"
                mode="range"
                type="month"
                prevent-overflow
                :allowed-months="(date:Date) => date <= new Date()"
                :allowed-years="(date:Date) => date <= new Date()"
              />
            </div>
          </div>
        </div>
      </va-card-content>
      <va-card-actions align="between">
        <va-button type="submit">Search</va-button>
        <va-button color="danger" @click="reset()">Reset</va-button>
      </va-card-actions>
    </va-form>
  </va-collapse>
</template>
<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { Filter, ModelSearchForm } from '../../data/types'

  const props = defineProps<{
    filters: Filter[]
    searchForm: ModelSearchForm
  }>()

  const sForm = ref({ ...props.searchForm })
  const emits = defineEmits(['onReset', 'onSubmit', 'onDateChange'])

  const initDateRange = {
    start: null,
    end: null,
  }
  const dateRange = ref({ ...initDateRange })

  watch(dateRange, () => {
    if (dateRange.value.start)
      emits('onDateChange', { start_date: new Date(dateRange.value.start).toISOString().split('T')[0] })
    if (dateRange.value.end)
      emits('onDateChange', { end_date: new Date(dateRange.value.end).toISOString().split('T')[0] })
  })

  function reset() {
    const { start, end } = dateRange.value
    if (start || end) dateRange.value = { ...initDateRange }
    emits('onReset')
  }
</script>
<style></style>
