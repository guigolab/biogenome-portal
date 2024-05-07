<template>
    <div>
        <div v-for="(filter, index) in filters" :key="index">
            <va-input class="mt-2" v-if="filter.type === 'input'" clearable v-model="searchForm[filter.key]"
                @update-model-value="(v: string) => onSubmitValue(v, filter.key)" :label="t(filter.label[locale])" />
            <va-select class="mt-2" v-else-if="filter.type === 'select'" clearable v-model="searchForm[filter.key]"
                @update-model-value="(v: string) => onSubmitValue(v, filter.key)" :label="t(filter.label[locale])"
                :options="filter.options" searchable />
            <va-switch class="mt-2" v-else-if="filter.type === 'checkbox'" v-model="searchForm[filter.key]"
                @update-model-value="(v: string) => onSubmitValue(v, filter.key)" :label="t(filter.label[locale])"
                color="#9c528b" />
        </div>
        <div v-for="(dateKey, index) in Object.keys(dateModels)" :key="index">
            <va-date-input class="mt-2" v-model="dateModels[dateKey]"
                @update-model-value="(v: DateRange) => onSubmitDate(v, dateKey)"
                :format-date="(date: Date) => date.toISOString().substring(0, 10)" clearable
                :label="t(dateLabels[dateKey].label[locale])" style="width: 100%" mode="range" type="month"
                prevent-overflow :allowed-years="(date: Date) => date <= new Date()" />
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Filter, DateRange } from '../../data/types'
import { useDateModelsAndLabels } from '../../composables/date-range'

const { t, locale } = useI18n()

const props = defineProps<{ filters: Array<Filter>, searchForm: Record<string, any> }>()

const { dateModels, dateLabels } = useDateModelsAndLabels(props)

const searchForm = ref({ ...props.searchForm })

const emits = defineEmits(['onSubmit', 'onReset'])

function onSubmitDate(value: DateRange, key: string) {
    const { start, end } = value
    const formattedDate: Record<string, string | null> = {}
    const gte = `${key}__gte`
    const lte = `${key}__lte`
    formattedDate[gte] = start ? new Date(start).toISOString().split('T')[0] : null
    formattedDate[lte] = end ? new Date(end).toISOString().split('T')[0] : null
    emits('onSubmit', formattedDate)
}

function onSubmitValue(value: string, key: string) {
    const obj = {}
    obj[key] = value
    emits('onSubmit', obj)
}

// function onReset() {
//     const { start, end } = dateRange.value
//     if (start || end) dateRange.value = { start: null, end: null }
//     emits('onReset')
// }

</script>