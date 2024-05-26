<template>
    <div class="row justify-space-between">
        <div class="flex">
            <TableFilters :key="model" @on-form-change="handleSubmit" @on-show-field-change="updateColumns"
                :store-form="searchForm" :columns="columns" :filters="filters" />
        </div>
        <div class="flex">
            <VaPagination v-model="offset" :page-size="limit" :total="total" :visible-pages="3" rounded
                buttons-preset="primary" gapped @update:model-value="handlePagination" />
        </div>
    </div>
    <div class="row">
        <div class="flex">
            <b>{{ t('search.total') }}</b> {{ total }}
        </div>
    </div>
    <va-data-table :key="model" sticky-header height="100%" :loading="isLoading" :items="items" :columns="tableColumns">
        <template #header(actions)>
            <VaButton @click="showModal = !showModal" color="info" grow :round="false">
                {{ t('buttons.downloadTSV') }}
            </VaButton>
        </template>
        <template #cell(image)="{ rowData }">
            <va-avatar v-if="rowData.image" size="large">
                <img :src="rowData.image" />
            </va-avatar>
        </template>
        <template #cell(actions)="{ rowData }">
            <va-chip v-if="getRoute(rowData)" :to="getRoute(rowData)" size="small">{{ t('buttons.view') }}</va-chip>
        </template>
        <template #cell(gff_gz_location)="{ rowData }">
            <va-chip :href="rowData.gff_gz_location" outline size="small">{{ t('buttons.download') }}</va-chip>
        </template>
        <template #cell(tab_index_location)="{ rowData }">
            <va-chip :href="rowData.tab_index_location" outline size="small">{{ t('buttons.download') }}</va-chip>
        </template>
    </va-data-table>
    <va-divider />
    <va-modal v-model="showModal" hide-default-actions :title="t('buttons.downloadTSV')">
        <va-inner-loading :loading="isTSVLoading">
            <div class="row">
                <VaSelect class="flex lg12 md12 sm12 xs12" v-model="downloadFields"
                    :searchPlaceholderText="t('download.fieldsSearchPlaceholder')" :label="t('download.fieldsLabel')"
                    :options="fieldsToDownload" :placeholder="t('download.fieldsPlaceholder')" allow-create="unique"
                    multiple @create-new="(v: string) => fieldsToDownload.push(v)"
                    :messages="[t('download.fieldsMessage')]" />
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaCheckbox style="margin-top: 6px;" v-model="applyFilters" :label="t('download.applyFilters')">
                    </VaCheckbox>
                </div>
            </div>
        </va-inner-loading>
        <template #footer>
            <va-button @click="downloadData()"> {{ t('buttons.submit') }} </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import CommonService from '../../../services/clients/CommonService'
import { useStore } from '../../../composables/use-model'
import { DataModel, Filter, } from '../../../data/types'
import TableFilters from '../../../components/common/TableFilters.vue'
import { useToast } from 'vuestic-ui'
import { AxiosError } from 'axios'

const downloadFields = ref<string[]>([])
const { init } = useToast()
const { t } = useI18n()
const props = defineProps<{
    columns: string[],
    filters: Filter[],
    model: string,
    countries?: string,
    parent_taxon?: string
}>()

const fieldsToDownload = ref([...props.columns])
const items = ref<Record<string, any>[]>([])
const showModal = ref(false)
const isLoading = ref(false)
const isTSVLoading = ref(false)
const applyFilters = ref(true)

const searchForm = computed(() => {
    const { store } = useStore(props.model as DataModel)
    return store.searchForm
})

const total = ref(0)
const offset = ref(1)

const limit = computed(() => {
    const { store } = useStore(props.model as DataModel)
    return store.pagination.limit
})
const columnsToShow = ref<string[]>([])

const tableColumns = computed(() => {
    return [...columnsToShow.value, 'actions']
})

async function downloadData() {
    const downloadRequest = { format: "tsv", fields: [...downloadFields.value] }
    try {
        isTSVLoading.value = true
        const requestData = applyFilters.value ? { ...searchForm.value, ...downloadRequest } : { ...downloadRequest }
        if (props.countries) requestData.countries = props.countries
        if (props.parent_taxon) requestData.parent_taxon = props.parent_taxon

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
        const axiosError = e as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        isTSVLoading.value = false
        showModal.value = !showModal.value
    }
}

watch(
    () => props.model,
    async (newModel) => {
        await updateData(newModel as DataModel)
    },
    { immediate: true }
)

async function updateData(model: DataModel) {
    const { store } = useStore(model)
    store.resetPagination()
    offset.value = 1 + store.pagination.offset
    const query = { ...store.searchForm }
    if (props.countries) query.countries = props.countries
    if (props.parent_taxon) query.parent_taxon = props.parent_taxon
    await fetchItems({ ...query, ...store.pagination })
    downloadFields.value = []
    fieldsToDownload.value = [...props.columns]
}

async function fetchItems(query: Record<string, any>) {
    isLoading.value = true
    try {
        const { data } = await CommonService.getItems(`/${props.model}`, query)
        items.value = [...data.data]
        total.value = data.total
    } catch (e) {
        const axiosError = e as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        isLoading.value = false
    }
}

async function handleSubmit(payload: Iterable<[string, any]>) {
    const { store } = useStore(props.model as DataModel)
    store.resetPagination()
    offset.value = 1 + store.pagination.offset
    const query = { ...store.searchForm, ...Object.fromEntries(payload) }
    store.searchForm = { ...query }
    if (props.countries) query.countries = props.countries
    if (props.parent_taxon) query.parent_taxon = props.parent_taxon
    await fetchItems({ ...query, ...store.pagination })
}

function handlePagination(value: number) {
    const { store } = useStore(props.model as DataModel)
    store.pagination.offset = value - 1
    const query = { ...store.searchForm }
    if (props.countries) query.countries = props.countries
    if (props.parent_taxon) query.parent_taxon = props.parent_taxon
    fetchItems({ ...query, ...store.pagination })
}

function updateColumns(payload: string[]) {
    columnsToShow.value = [...payload]
}

function getRoute(rowData: Record<string, any>) {
    switch (props.model) {
        case 'assemblies':
            return rowData.accession ? { name: 'assembly', params: { accession: rowData.accession } } : undefined;
        case 'biosamples':
            return rowData.accession ? { name: 'biosample', params: { accession: rowData.accession } } : undefined;
        case 'experiments':
            return rowData.experiment_accession ? { name: 'experiment', params: { accession: rowData.experiment_accession } } : undefined;
        case 'organisms':
            return rowData.taxid ? { name: 'organism', params: { taxid: rowData.taxid } } : undefined;
        case 'local_samples':
            return rowData.local_id ? { name: 'local_sample', params: { id: rowData.local_id } } : undefined;
        case 'annotations':
            return rowData.name ? { name: 'annotation', params: { name: rowData.name } } : undefined;
        default:
            return undefined; // handle unknown props.model
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