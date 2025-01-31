<template>
    <VaInput :placeholder="t('fieldLookup.placeholder')" @update:model-value="debouncedUpdateSearch"
        v-model="inputField" :label="t('fieldLookup.label')">
        <template #appendInner>
            <VaIcon name="fa-circle-check" :color="fieldExists ? 'success' : 'danger'" style="margin-left: 5px;"
                :loading="isLoading">
            </VaIcon>
        </template>
    </VaInput>
    <span style="font-size: 0.8rem;" :class="fieldExists ? 'va-text-success' : 'va-text-danger'">
        {{ t(fieldExistsLabel) }}
    </span>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useItemStore } from '../stores/items-store'
import { DataModels } from '../data/types';
import CommonService from '../services/CommonService';
import { useI18n } from 'vue-i18n';


const {t} = useI18n()
const itemStore = useItemStore()
const isLoading = ref(false)
const fieldExists = ref<boolean>()
const inputField = ref('')
const fieldToQuery = ref('')

const props = defineProps<{
    model: DataModels
}>()

const emits = defineEmits(['fieldExists'])

const fieldExistsLabel = computed(() => fieldExists.value? 'fieldLookup.valid':'fieldLookup.invalid')
function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

const debouncedUpdateSearch = debounce(async (filter: string) => {
    fieldToQuery.value = filter
    if (!filter && filter.length <= 1) return
    const query = itemStore.buildQuery()
    query[`${filter}__exists`] = true
    isLoading.value = true
    fieldExists.value = false
    try {
        const { data } = await CommonService.getItems(props.model, query)
        if(data.total > 0){
            emits('fieldExists', filter)
            fieldExists.value = true
        }
    } catch (error) {
        console.log(error)
        fieldExists.value = false
    } finally {
        isLoading.value = false
    }
}, 700);

</script>