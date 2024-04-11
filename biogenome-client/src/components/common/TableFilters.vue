<template>
    <div class="row">
        <div class="flex">
            <VaInput v-model="searchForm.filter" clearable
                @update:modelValue="(v: string) => emits('onFormChange', [['filter', v.length > 2 ? v : '']])"
                :placeholder="t('buttons.search')">
                <template #appendInner>
                    <va-icon name="search" />
                </template>
            </VaInput>
        </div>
        <div class="flex">
            <VaButtonDropdown stickToEdges :closeOnContentClick="false" icon="hide_source" preset="primary"
                :label="t('buttons.fields')">
                <div class="w-200">
                    <div v-for="( field, index ) in  showFields ">
                        <VaSwitch class="mt-2" :key="index" v-model="showFields[index].show" :label="field.value"
                            size="small" />
                    </div>
                </div>
            </VaButtonDropdown>
        </div>
        <div class="flex">
            <VaBadge overlap color="warning" :text="activeFilters">
                <VaButtonDropdown stickToEdges :closeOnContentClick="false" icon="filter_list"
                    :label="t('buttons.filters')" preset="primary">
                    <div class="w-200">
                        <div v-for="( field, index ) in filters" :key="index">
                            <VaInput class="mt-2" clearable :label="field.key" v-if="isInputField(field.type)"
                                v-model="searchForm[field.key]"
                                @update:modelValue="(v: string) => emits('onFormChange', [[field.key, v]])">
                            </VaInput>
                            <VaSelect class="mt-2" clearable :label="field.key" v-else-if="isSelectField(field.type)"
                                v-model="searchForm[field.key]" :options="field.options"
                                @update:modelValue="(v: string) => emits('onFormChange', [[field.key, v]])">
                            </VaSelect>
                            <VaCheckbox v-else-if="isCheckBoxField(field.type)" v-model="searchForm[field.key]"
                                class="mt-2" :label="t(field.label[locale])"
                                @update:modelValue="(v: string) => emits('onFormChange', [[field.key, v]])" />
                            <VaDateInput v-else-if="isDateField(field.type)" class="mt-2"
                                v-model="dateModels[field.key]"
                                @update:modelValue="(v: DateRange) => updateDateRange(v, field.key)"
                                :format-date="(date: Date) => date.toISOString().substring(0, 10)"
                                :label="t(field.label[locale])" style="width: 100%" mode="range" type="month"
                                prevent-overflow :allowed-years="(date: Date) => date <= new Date()">
                                <template #append>
                                    <VaIcon name="va-clear" color="secondary" @click="clearDate(field.key)"></VaIcon>
                                </template>
                            </VaDateInput>
                        </div>
                    </div>
                </VaButtonDropdown>
            </VaBadge>
        </div>
        <div class="flex">
            <VaButtonDropdown stickToEdges preset="primary" :closeOnContentClick="false" :label="t('buttons.sort')"
                icon="sort">
                <div class="w-200">
                    <div>
                        <VaSelect clearable class="mt-2" :label="t('search.sortColumn')"
                            v-model="searchForm.sort_column" :options="columns" />
                    </div>
                    <div>
                        <VaSelect clearable class="mt-2" :label="t('search.sortOrder')" v-model="searchForm.sort_order"
                            :options="['asc', 'desc']" />
                    </div>
                </div>
            </VaButtonDropdown>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue';
import { DateRange, Filter } from '../../data/types'
import { useI18n } from 'vue-i18n';


const { t, locale } = useI18n()
const props = defineProps<{ filters: Array<Filter>, storeForm: Record<string, any>, columns: string[] }>()

const showFields = ref(props.columns.map(c => {
    return {
        show: true,
        value: c
    }
}))
const dateModels = ref({ ...mapDates(props.storeForm) })
const searchForm = ref({ ...props.storeForm })

const activeFilters = computed(() => {
    return Object.entries(searchForm.value)
        .filter(([k, v]) => !['filter', 'sort_column', 'sort_order'].includes(k))
        .filter(([k, v]) => v).length
})
// watchEffect(() => {
//     emits('onFormChange', searchForm.value)
// })

watchEffect(() => {
    emits('onShowFieldChange', showFields.value.filter(f => f.show).map(f => f.value))
})

const emits = defineEmits(['onFormChange', 'onShowFieldChange'])


function mapDates(storeFormSearch: Record<string, any>) {

    const dates = {} as Record<string, any>
    Object.entries(storeFormSearch)
        .filter(([k, v]) => k.includes('__gte') || k.includes('__lte'))
        .forEach(([k, v]) => {
            const indexGte = k.indexOf('__gte');
            const indexLte = k.indexOf('__lte');
            // Determine whether it's __gte or __lte and set the appropriate property accordingly
            const index = indexGte !== -1 ? indexGte : indexLte;
            const keyValue = k.substring(0, index);
            // Assign values to the dateModels and dateLabels
            if (indexGte !== -1) {
                const startDate = v ? new Date(v) : null;
                dates[keyValue] = { start: startDate, end: dates[keyValue]?.end };
            } else {
                const endDate = v ? new Date(v) : null;
                dates[keyValue] = { start: dates[keyValue]?.start, end: endDate };
            }
        })
    return dates
}

function updateDateRange(v: DateRange, key: string) {
    // console.log(v)
    const { start, end } = v
    searchForm.value[`${key}__gte`] = start
    searchForm.value[`${key}__lte`] = end
    emits('onFormChange', [[`${key}__gte`, start], [`${key}__lte`, end]])
}

function clearDate(key: string) {
    dateModels.value[key].start = null
    dateModels.value[key].end = null
    searchForm.value[`${key}__gte`] = null
    searchForm.value[`${key}__lte`] = null
    emits('onFormChange', [[`${key}__gte`, null], [`${key}__lte`, null]])

}


function isInputField(type: string) {
    return type === 'input';
}
function isSelectField(type: string) {
    return type === 'select';
}
function isDateField(type: string) {
    return type === 'date';
};
function isCheckBoxField(type: string) {
    return type === 'checkbox';
};

</script>
<style scoped>
.w-200 {
    max-width: 350px;
}
</style>