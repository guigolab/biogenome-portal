<template>
    <div class="row justify-space-between align-end">
        <div class="flex">
            <TableFilters :key="model" @on-form-change="handleSubmit" @on-show-field-change="updateColumns"
                :store-form="searchForm" :columns="columns" :filters="filters" />
        </div>
        <div class="flex">
            <VaPagination v-model="offset" :page-size="limit" :total="total" :visible-pages="3" border-color="primary"
                buttons-preset="secondary" gapped @update:model-value="handlePagination" />
        </div>
    </div>
    <va-data-table sticky-header height="500px" :loading="isLoading" :items="items" :columns="tableColumns">
        <template #header(actions)>
            <VaButton @click="showModal = !showModal" color="info" grow :round="false">
                {{ t('buttons.download') }}
            </VaButton>
        </template>
        <template #cell(image)="{ rowData }">
            <va-avatar size="large">
                <img :src="rowData.image" />
            </va-avatar>
        </template>
        <template #cell(actions)="{ rowData }">
            <va-chip v-if="getRoute(rowData)" :to="{path: getRoute(rowData)}" size="small">{{ t('buttons.view') }}</va-chip>
        </template>
    </va-data-table>
    <va-divider />
    <div class="row justify-end">
        <div class="flex">
            <b>{{ t('search.total') }}</b> {{ total }}
        </div>
    </div>
    <va-modal v-model="showModal" hide-default-actions>
        <div class="row">
            <VaSelect class="flex lg12 md12 sm12 xs12" v-model="downloadFields" :label="t('download.fieldsLabel')"
                :options="columns" :placeholder="t('download.fieldsPlaceholder')" allow-create="unique" multiple
                @create-new="(v: string) => downloadFields.push(v)" />
        </div>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaCheckbox style="margin-top: 6px;" v-model="applyFilters" :label="t('download.applyFilters')">
                </VaCheckbox>
            </div>

        </div>
        <template #footer>
            <va-button @click="downloadData()"> {{ t('buttons.submit') }} </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CommonService from '../../../services/clients/CommonService'
import { useStore } from '../../../composables/use-model'
import { Filter } from '../../../data/types'
import TableFilters from '../../../components/common/TableFilters.vue'

const downloadFields = ref<string[]>([])

const { t } = useI18n()
const props = defineProps<{
    columns: string[],
    filters: Filter[],
    model: string
}>()
const items = ref<Record<string, any>[]>([])
const showModal = ref(false)
const isLoading = ref(false)
const router = useRouter()
const applyFilters = ref(false)

const searchForm = computed(() => {
    const { store } = useStore(props.model)
    return store.searchForm
})

const total = ref(0)
const offset = ref(1)

const limit = computed(() => {
    const { store } = useStore(props.model)
    return store.pagination.limit
})
const columnsToShow = ref<string[]>([])

const tableColumns = computed(() => {
    return [...columnsToShow.value, 'actions']
})

async function downloadData() {
    const downloadRequest = { format: "tsv", fields: [...downloadFields.value] }
    try {
        const requestData = applyFilters.value ? { ...searchForm.value, ...downloadRequest } : { ...downloadRequest }
        const response = await CommonService.getTsv(`/${props.model}`, requestData)
        const data = response.data
        const href = URL.createObjectURL(data);

        const filename = `${props.model}_report.tsv`
        // create "a" HTML element with href to file & click
        const link = document.createElement('a');
        link.href = href;
        link.setAttribute('download', filename); //or any other extension
        document.body.appendChild(link);
        link.click();

        // clean up "a" element & remove ObjectURL
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    } catch (e) {
        console.log(e)
    } finally {

    }

}




onMounted(async () => {
    await handleSubmit([])
})


async function fetchItems(query: Record<string, any>) {
    isLoading.value = true
    try {
        const { data } = await CommonService.getItems(`/${props.model}`, query)
        items.value = [...data.data]
        total.value = data.total
    } catch (e) {
        console.log(e)
    } finally {
        isLoading.value = false
    }
}

async function handleSubmit(payload: Iterable<[string, any]>) {
    const { store } = useStore(props.model)
    store.resetPagination()
    offset.value = 1 + store.pagination.offset
    const entries = Object.fromEntries(payload)
    store.searchForm = { ...store.searchForm, ...entries }
    await fetchItems({ ...store.searchForm, ...store.pagination })
}

function handlePagination(value: number) {
    const { store } = useStore(props.model)
    store.pagination.offset = value - 1
    fetchItems({ ...store.searchForm, ...store.pagination })
}

function updateColumns(payload: string[]) {
    columnsToShow.value = [...payload]
}

function getRoute(rowData:Record<string,any>){
    if(rowData.accession){
        console.log(props.model)
        return `${props.model}/${rowData.accession}`
    }
}

</script>

<style lang="scss">
.chart {
    height: 400px;
}

.row-equal .flex {
    .va-card {
        height: 100%;
    }
}
</style>