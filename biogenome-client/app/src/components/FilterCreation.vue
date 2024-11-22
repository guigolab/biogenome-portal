<template>

    <Fieldset legend="Add filter" :toggleable="true">
        <div>
            <InputGroup>
                <InputText @update:model-value="debouncedUpdateSearch" :invalid="invalidField" v-model="fieldKey"
                    placeholder="Field Key" />
                <Button></Button>
                <!-- <Button :loading="isLoading" :severity="invalidField" label="Check field" /> -->
            </InputGroup>
        </div>
        <div>
            <Select v-model="filterType" :options="filterChoices" placeholder="Select a Type"></Select>
            <Message>{{ selectTypeMessage }}</Message>
        </div>
        <div>
            <Button label="Submit"></Button>
        </div>
    </Fieldset>

</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DataModels, Filter } from '../data/types';
import { useItemStore } from '../stores/items-store';
import CommonService from '../services/CommonService';
import { useDebounce } from '../composable/useDebounce';
import { Select, SelectButton, DatePicker } from 'primevue';

const itemStore = useItemStore()

const props = defineProps<{
    model: DataModels
}>()

const form = ref<Record<string, any> | null>(null)
const currentFilters = ref<Filter[]>([])
const validField = ref("")
const isLoading = ref(false)
const fieldKey = ref('')
const filterChoices = ['range', ' date', 'checkbox', 'select']
const filterType = ref('range')

const selectTypeMessage = computed(() => filterType.value === 'range' ? 'Select between a range of values useful with numbers and dates' : filterType.value === 'checkbox' ? 'Check whether a field exists' : filterType.value === 'data' ? 'Selecte a data range' : 'Select between a list of options')


watch(() => props.model, (v1, v2) => {
    console.log(v1)
    console.log(v2)
    const { filters, searchForm } = filterStore.getForm(props.model)
    form.value = { ...searchForm }
    currentFilters.value = [...filters]

}, { immediate: true })

const debouncedUpdateSearch = useDebounce(async (key: string) => {
    if (!key || !key.trim().length) return
    const field = `${key}__exists`
    const { data } = await CommonService.getItems(props.model, Object.fromEntries([[field, true]]))
    if (data.total > 0) {
        invalidField.value = false
        validField.value = key
    }

}, 400);


</script>