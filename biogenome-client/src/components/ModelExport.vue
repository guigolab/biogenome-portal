<template>
    <VaModal hide-default-actions close-button v-model="itemStore.showTsvModal">
        <div class="va-gutter-5 layout fluid">
            <h3 class="va-h3">{{ t('reportModal.title') }}</h3>
            <p class="light-paragraph mb-15">
                {{ t('reportModal.description') }}
            </p>
            <VaInnerLoading :loading="itemStore.isTSVLoading">
                <p>
                    Downloading
                    <span class="va-text-bold">{{ itemStore.total }}</span>
                    {{ model }} in
                    <span class="va-text-bold"> {{ format }}</span>
                    format
                </p>
                <div class="row align-center justify-space-between">
                    <div class="flex lg8 md8 sm12 xs12">
                        <VaSelect inner-label label="Format" v-model="format" :options="formats"></VaSelect>
                        <span style="font-size: 0.8rem;" class="va-text-secondary">
                            {{ t('reportModal.tip') }}
                        </span>
                    </div>
                </div>
                <div v-if="format === 'tsv'">
                    <div class="row">
                        <div class="flex lg8 md8 sm12 xs12">
                            <VaInput @update:model-value="debouncedUpdateSearch" v-model="inputField" inner-label
                                label="Field lookup">
                                <template v-if="fieldToQuery" #appendInner>
                                    <VaIcon name="fa-circle-check" :color="fieldExists ? 'success' : 'danger'"
                                        style="margin-left: 5px;" :loading="isLoading">
                                    </VaIcon>
                                </template>
                            </VaInput>
                            <div v-if="fieldToQuery">
                                <span style="font-size: 0.8rem;"
                                    :class="fieldExists ? 'va-text-success' : 'va-text-danger'"> {{ inputField }}
                                    is {{
                                        fieldExists ? '' : 'not' }} valid {{ duplicate ? `, but the field is already
                                    present in the options, select if
                                    from there` : '' }}</span>
                            </div>
                            <div v-else>
                                <span style="font-size: 0.8rem;" class="va-text-secondary">
                                    {{ t('reportModal.queryMessage') }}
                                </span>
                            </div>
                        </div>
                        <div v-if="fieldExists && fieldToQuery" class="flex">
                            <VaButton :disabled="fields.includes(fieldToQuery)" @click="addField" color="success"
                                icon="fa-plus">
                                {{ t('reportModal.addFieldBtn') }}</VaButton>
                        </div>
                        <div class="flex">
                            <VaButton @click="inputField = ''; fieldToQuery = ''" color="danger"
                                :disabled="!fieldToQuery" icon="fa-close">
                                {{ t('reportModal.clearFieldBtn') }}
                            </VaButton>
                        </div>
                    </div>
                    <div class="row">
                        <div class="flex lg12 md12 sm12 xs12">
                            <VaSelect v-model="selectedFields" :label="t('download.fieldsLabel')" :options="fields"
                                :placeholder="t('download.fieldsPlaceholder')" multiple>
                                <template #content="{ value }">
                                    <VaChip outline color="textPrimary" size="small" v-for="v in value" :key="v" style="margin: 4px;">
                                        {{ v }}
                                    </VaChip>
                                </template>
                            </VaSelect>
                        </div>
                    </div>
                </div>

            </VaInnerLoading>
        </div>
        <template #footer>
            <VaButton :loading="itemStore.isTSVLoading" @click="downloadData()"> {{ t('buttons.submit')
                }} </VaButton>
        </template>
    </VaModal>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useItemStore } from '../stores/items-store'
import { useI18n } from 'vue-i18n'
import { DataModels } from '../data/types';
import CommonService from '../services/CommonService';
import { computed } from '@vue/reactivity';

const props = defineProps<{
    model: DataModels,
    columns: string[]
}>()
const { t } = useI18n()

const itemStore = useItemStore()
const fields = ref([...props.columns])
const selectedFields = ref([...props.columns])
const format = ref('tsv')

const formats = ['tsv', 'json', 'jsonl']
const isLoading = ref(false)
const fieldExists = ref<boolean>()
const inputField = ref('')
const fieldToQuery = ref('')

watch(() => props.columns, () => {
    selectedFields.value = [...props.columns]
    fields.value = [...props.columns]
})

async function downloadData() {
    await itemStore.downloadData(props.model, selectedFields.value, format.value)
}

const duplicate = computed(() => fields.value.includes(fieldToQuery.value))
function addField() {
    //add field to selected options
    fields.value.push(fieldToQuery.value)
    selectedFields.value = [...selectedFields.value, fieldToQuery.value]
    inputField.value = ""
    fieldToQuery.value = ""
    fieldExists.value = false
}
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
        fieldExists.value = data.total > 0
    } catch (error) {
        console.log(error)
        fieldExists.value = false
    } finally {
        isLoading.value = false
    }
}, 700);

</script>