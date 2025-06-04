<template>
    <VaModal hide-default-actions close-button v-model="itemStore.showTsvModal">
        <div class="va-gutter-5 layout fluid">
            <h3 class="va-h3">{{ t('reportModal.title') }}</h3>
            <p class="light-paragraph">
                {{ t('reportModal.description') }}
            </p>
            <VaDivider />
            <VaInnerLoading :loading="itemStore.isTSVLoading">
                <div class="row align-center">
                    <div class="flex">
                        <p class="va-text-bold">{{ t('reportModal.formatLabel') }}</p>
                    </div>
                    <div class="flex">
                        <VaRadio v-model="format" :options="formats" />
                    </div>
                </div>
                <div v-if="format === 'tsv'" class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <VaCard square outlined>
                            <VaCollapse :header="t('reportModal.addFieldBtn')" icon="fa-plus">
                                <FieldLookup :model="model" @fieldExists="addField" />
                            </VaCollapse>
                            <VaCardContent>
                                <VaOptionList :options="fields" v-model="selectedFields" />
                            </VaCardContent>
                        </VaCard>
                    </div>
                </div>
                <VaDivider />
                <p>
                    Downloading
                    <span class="va-text-bold">{{ itemStore.total }}</span>
                    {{ model }} in
                    <span class="va-text-bold"> {{ format }}</span>
                    format
                </p>
            </VaInnerLoading>
        </div>
        <template #footer>
            <VaButton :loading="itemStore.isTSVLoading" @click="downloadData()"> {{ t('buttons.download')
            }} </VaButton>
        </template>
    </VaModal>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useItemStore } from '../stores/items-store'
import { useI18n } from 'vue-i18n'
import { DataModels } from '../data/types'
import FieldLookup from './FieldLookup.vue'

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

watch(() => props.columns, () => {
    selectedFields.value = [...props.columns]
    fields.value = [...props.columns]
})

async function downloadData() {
    await itemStore.downloadData(props.model, selectedFields.value, format.value)
}

function addField(field: string) {
    if (!fields.value.includes(field)) {
        fields.value.push(field)
        selectedFields.value = [...selectedFields.value, field]
    }
}
</script>
<style lang="scss" scoped>
.mb-4 {
    margin-bottom: 1rem;
}
</style>