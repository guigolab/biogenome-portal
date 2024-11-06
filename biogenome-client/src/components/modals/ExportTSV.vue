<template>
    <VaModal v-model="itemStore.showTsvModal">
        <VaInnerLoading :loading="itemStore.isTSVLoading">

            <h3 class="va-h3">{{ t('buttons.downloadTSV') }}</h3>
            <p class="light-paragraph mb-15">
                {{ t('download.fieldsMessage') }}
            </p>
            <div class="row mb-15">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaSelect v-model="selectedFields" :searchPlaceholderText="t('download.fieldsSearchPlaceholder')"
                        :label="t('download.fieldsLabel')" :options="fields"
                        :placeholder="t('download.fieldsPlaceholder')" allow-create="unique" multiple
                        @create-new="(v: string) => fields.push(v)">
                        <template #content="{ value }">
                            <VaChip square size="small" color="secondary" v-for="v in value" :key="v" class="m-2">
                                {{ v }}
                            </VaChip>
                        </template>
                    </VaSelect>
                </div>
            </div>
            <div class="row">
                <div class="flex lg6 md6 sm12 xs12">
                    <VaCheckbox class="mt-6" v-model="applyFilters" :label="t('download.applyFilters')">
                    </VaCheckbox>
                </div>
            </div>
        </VaInnerLoading>
        <template #footer>
            <VaButton preset="submit" :loading="itemStore.isTSVLoading" @click="downloadData()"> {{ t('buttons.submit')
                }} </VaButton>
        </template>
    </VaModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useItemStore } from '../../stores/items-store'
import { useI18n } from 'vue-i18n'
import { DataModels } from '../../data/types';
import { useConfig } from '../../composable/useConfig';

const props = defineProps<{
    model: DataModels
}>()
const { t } = useI18n()
const itemStore = useItemStore()

const applyFilters = ref(true)

const fields = computed(() => {
    const { columns } = useConfig(props.model)
    return columns.value
})

const selectedFields = ref([...fields.value])

watch(() => fields.value, () => selectedFields.value = [...fields.value])

async function downloadData() {
    await itemStore.downloadData(props.model, selectedFields.value, applyFilters.value)
}

</script>
<style scoped>
.mb-15 {
    margin-bottom: 15px;
}

.m-2 {
    margin: 2px;
}
</style>