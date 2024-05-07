<template>
    <div class="row justify-space-between align-end">
        <div class="flex">
            <TableFilters :key="model" @on-form-change="handleSubmit" @on-show-field-change="updateColumns"
                :store-form="searchForm" :columns="columns" :filters="filters" />
        </div>
        <div class="flex">
            <div class="flex">
                <VaPagination v-model="offset" :page-size="limit" :total="total" :visible-pages="3" rounded
                    buttons-preset="primary" gapped @update:model-value="handlePagination" />
            </div>
        </div>
    </div>
    <div class="row justify-end">
        <div class="flex">
            <b>{{ t('search.total') }}</b> {{ total }}
        </div>
    </div>
    <va-data-table sticky-header height="100%" :loading="isLoading" :items="items" :columns="tableColumns">
        <template #header(actions)>
            <VaButton @click="showModal = !showModal" color="info" grow :round="false">
                {{ t('buttons.downloadTSV') }}
            </VaButton>
        </template>
        <template #cell(image)="{ rowData }">
            <va-avatar size="large">
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
        <template #footer>
            <va-button @click="downloadData()"> {{ t('buttons.submit') }} </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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
    model: DataModel
}>()

const fieldsToDownload = ref([...props.columns])
const items = ref<Record<string, any>[]>([])
const showModal = ref(false)
const isLoading = ref(false)
const router = useRouter()
const applyFilters = ref(true)

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
        const axiosError = e as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        showModal.value = !showModal.value
    }

}


watch(router.currentRoute, () => {
    const { store } = useStore(props.model)

    if (router.currentRoute.value.name !== 'taxon' && store.searchForm.parent_taxon) {
        store.searchForm.parent_taxon = undefined

    } if (router.currentRoute.value.name === 'organisms' && store.searchForm.countries) {
        store.searchForm.countries = undefined
    }
})


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

function getRoute(rowData: Record<string, any>) {
    switch (props.model) {
        case 'assemblies':
            return { name: 'assembly', params: { accession: rowData.accession } }

        case 'biosamples':
            return { name: 'biosample', params: { accession: rowData.accession } }

        case 'experiments':
            return { name: 'experiment', params: { accession: rowData.experiment_accession } }

        case 'organisms':
            return { name: 'organism', params: { taxid: rowData.taxid } }

        case 'local_samples':
            return { name: 'local_sample', params: { id: rowData.local_id } }

        case 'annotations':
            return { name: 'annotation', params: { name: rowData.name } }
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