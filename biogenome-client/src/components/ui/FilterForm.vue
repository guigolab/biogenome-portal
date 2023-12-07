<template>
  <va-form tag="form" @submit.prevent="onSubmit">
    <va-card-content>
      <div class="row align-end">
        <div v-for="(filter, index) in filters" :key="index" class="flex lg3 md4 sm12 xs12">
          <div v-if="filter.type === 'input'">
            <va-input v-model="searchForm[filter.key]" :label="t(filter.label)" />
          </div>
          <div v-else-if="filter.type === 'select'">
            <va-select v-model="searchForm[filter.key]" :label="t(filter.label)" :options="filter.options" searchable />
          </div>
          <div v-else-if="filter.type === 'date'">
            <va-date-input v-model="dateRange" :format-date="(date: Date) => date.toISOString().substring(0, 10)"
              :label="t(filter.label)" style="width: 100%" mode="range" type="month" prevent-overflow
              :allowed-years="(date: Date) => date <= new Date()" />
          </div>
          <div v-else-if="filter.type === 'checkbox'">
            <va-switch v-model="searchForm[filter.key]" :label="t(filter.label)" color="#9c528b" />
          </div>
        </div>
        <div class="flex"> <va-button type="submit">{{ t('buttons.submit') }}</va-button>
        </div>
        <div class="flex"> <va-button color="danger" @click="onReset">{{ t('buttons.reset') }}</va-button>
        </div>
      </div>
    </va-card-content>
  </va-form>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Filter } from '../../data/types'

const { t } = useI18n()

const props = defineProps<{ filters: Array<Filter>, searchForm: Record<string, any> }>()

const dateRange = ref<{ start: Date | null, end: Date | null }>({
  start: props.searchForm.start_date ? new Date(props.searchForm.start_date) : null,
  end: props.searchForm.end_date ? new Date(props.searchForm.end_date) : null
})

const emits = defineEmits(['onSubmit', 'onReset'])

function onSubmit() {
  const { start, end } = dateRange.value
  if (start && end) {
    props.searchForm.start_date = new Date(start).toISOString().split('T')[0]
    props.searchForm.end_date = new Date(end).toISOString().split('T')[0]
  }
  emits('onSubmit')
}

function onReset() {
  const { start, end } = dateRange.value
  if (start || end) dateRange.value = { start: null, end: null }
  emits('onReset')
}
</script>