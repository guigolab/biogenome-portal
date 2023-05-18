<template>
  <va-form tag="form" @submit.prevent="onSubmit">
    <va-card-content>
      <div class="row align-center justify-space-between">
        <div v-for="(filter, index) in filters" :key="index" class="flex lg3 md4 sm12 xs12">
          <div v-if="filter.type === 'input'">
            <va-input
              v-model="searchForm[filter.key]"
              :label="t(filter.label)"
            />
          </div>
          <div v-else-if="filter.type === 'select'">
            <va-select
              v-model="searchForm[filter.key]"
              :label="t(filter.label)"
              :options="filter.options"
            />
          </div>
          <div v-else-if="filter.type === 'date'">
            <va-date-input
              v-model="dateRange"
              :format-date="(date:Date) => date.toISOString().substring(0,10)"
              :label="t(filter.label)"
              style="width: 100%"
              mode="range"
              type="month"
              prevent-overflow
              :allowed-years="(date:Date) => date <= new Date()"
            />
          </div>
        </div>
      </div>
    </va-card-content>
    <va-card-actions align="between">
      <va-button type="submit">{{t('buttons.submit')}}</va-button>
      <va-button color="danger" @click="onReset">{{t('buttons.reset')}}</va-button>
    </va-card-actions>
  </va-form>
</template>
<script setup lang="ts">
  import {ref} from 'vue'
  import { useI18n } from 'vue-i18n'
  import {Filter} from '../../data/types'

  const { t } = useI18n()

  const props = defineProps<{filters:Array<Filter>}>()

  const initSearchForm = {}

  const searchForm = ref({...initSearchForm})

  const initDateRange = {
    start: null,
    end: null,
  }

  const dateRange = ref({...initDateRange})

  const emits = defineEmits(['onSubmit','onReset'])

  function onSubmit(){
    const { start, end } = dateRange.value
    if(start && end){
      const formattedDates = {
        start_date: new Date(start).toISOString().split('T')[0], 
        end_date: new Date(end).toISOString().split('T')[0]
      }
      searchForm.value = {...searchForm.value, ...formattedDates}
    } 
    emits('onSubmit', searchForm.value)
  }
  
  function onReset(){
    const { start, end } = dateRange.value
    if (start || end) dateRange.value = { ...initDateRange }
    searchForm.value = {...initSearchForm}
    emits('onReset')
  }
</script>