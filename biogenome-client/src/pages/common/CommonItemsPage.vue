<template>
    <div>
        <ChartsBlock v-if="charts.length" :charts="(charts as InfoBlock[])" />
        <div class="row row-equal">
            <div class="flex lg12 md12 sm12 xs12">
                <!-- <va-card :stripe="Boolean(errorMessage)" stripe-color="danger"> -->
                    <va-card-content style="padding-bottom: 0;" class="row justify-space-between align-center">
                        <div class="flex">
                            <TableFilters @on-form-change="handleSubmit" @on-show-field-change="updateColumns"
                                :store-form="store.searchForm" :columns="columns" :filters="modelFilters" />
                        </div>
                        <div class="flex">
                            <VaPagination v-model="offset" :page-size="store.pagination.limit" :total="total"
                                :visible-pages="3" buttons-preset="secondary" rounded gapped border-color="primary"
                                @update:model-value="handlePagination" />
                        </div>
                    </va-card-content>
                    <!-- <va-skeleton v-if="isLoading" height="400px" />
                    <va-card-content style="height: 400px;" v-else-if="errorMessage">
                        {{ errorMessage }}
                    </va-card-content> -->
                    <va-card-content>
                        <va-data-table style="height: 400px;" :loading="isLoading" :items="items" :columns="columnsToShow" />
                        <va-divider/>
                        <div class="row justify-end">
                            <div class="flex">
                                <b>{{ t('table.total') }}</b> {{ total }}
                            </div>
                        </div>

                        <!-- <DataTable :items="items" :columns="config.columns" /> -->

                    </va-card-content>
                <!-- </va-card> -->
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import ChartsBlock from '../../components/common/ChartsBlock.vue'
import FilterForm from '../../components/forms/FilterForm.vue'
import { useI18n } from 'vue-i18n'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CommonService from '../../services/clients/CommonService'
import { useModel } from '../../composables/use-model'
import { Filter, InfoBlock } from '../../data/types'
import TableFilters from '../../components/common/TableFilters.vue'



const { t } = useI18n()
const items = ref<Record<string, any>[]>([])
const isLoading = ref(false)
const errorMessage = ref<string>('')
const router = useRouter()
const model = ref(router.currentRoute.value.name as string)
const { store, charts, columns, filters } = useModel(model.value)
const modelFilters = ref(filters as Filter[])
const total = ref(0)
const offset = ref(1 + store.pagination.offset)

const columnsToShow = ref<string[]>([])

onMounted(() => {
    fetchItems({ ...store.pagination })
    columnsToShow.value = [...columns]
})

async function fetchItems(query: Record<string, any>) {
    isLoading.value = true
    errorMessage.value = ''
    try {
        const { data } = await CommonService.getItems(`/${model.value}`, query)
        items.value = [...data.data]
        total.value = data.total

    } catch (e) {
        errorMessage.value = "Something happened"
    } finally {
        isLoading.value = false
    }
}

function handleSubmit(payload:Iterable<[string, any]>) {
    store.resetPagination()
    const entries = Object.fromEntries(payload)
    store.searchForm = { ...entries }
    fetchItems({ ...store.searchForm, ...store.pagination })
}

function handlePagination(value: number) {
    store.pagination.offset = value - 1
    fetchItems({ ...store.searchForm, ...store.pagination })
}

function updateColumns(payload: string[]) {
    columnsToShow.value = [...payload]
}

function reset() {
    store.resetSearchForm()
    store.resetPagination()
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