<template>
    <VaModal v-model="itemStore.showTsvModal" hide-default-actions :title="t('buttons.downloadTSV')">
        <VaInnerLoading :loading="itemStore.isTSVLoading">
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaSelect v-model="selectedFields" :searchPlaceholderText="t('download.fieldsSearchPlaceholder')"
                        :label="t('download.fieldsLabel')" :options="fields"
                        :placeholder="t('download.fieldsPlaceholder')" allow-create="unique" multiple
                        @create-new="(v: string) => fields.push(v)" :messages="[t('download.fieldsMessage')]" />
                </div>
            </div>
            <div class="row">
                <div class="flex lg6 md6 sm12 xs12">
                    <VaCheckbox style="margin-top: 6px;" v-model="applyFilters" :label="t('download.applyFilters')">
                    </VaCheckbox>
                </div>
            </div>
        </VaInnerLoading>
        <template #footer>
            <VaButton @click="downloadData()"> {{ t('buttons.submit') }} </VaButton>
        </template>
    </VaModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import columns from '../../../configs/columns.json'

const { t } = useI18n()
const itemStore = useItemStore()

const applyFilters = ref(true)

const model = computed(() => itemStore.currentModel as keyof typeof columns)

const fields = computed(() => {
    return columns[model.value] || []
})

const selectedFields = ref([...fields.value])

watch(() => fields.value, () => selectedFields.value = [...fields.value])

async function downloadData() {
    await itemStore.downloadData(selectedFields.value, applyFilters.value)
}

</script>