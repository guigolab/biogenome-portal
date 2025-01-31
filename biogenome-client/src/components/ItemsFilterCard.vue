<template>
    <VaCard>
        <VaCardContent>
            <div class="row align-center justify-space-between">
                <div class="flex">
                    <h3 class="va-h6">{{ t('items.filters.title') }}</h3>
                </div>

                <div class="flex">
                    <VaButton icon="fa-close" :disabled="activeFilters.length === 0" @click="resetFilters()"
                        color="textPrimary">
                        {{ t('items.filters.clearBtn') }}</VaButton>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaButton color="textPrimary" preset="primary" @click="showModal = !showModal" icon="fa-plus" block>
                        {{ t('items.filters.addBtn') }}</VaButton>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent>
            <ModelFilters @form-updated="handleUpdate" :filters="customFilters" :model="model" />

            <ModelFilters @form-updated="handleUpdate" :filters="filters" :model="model" />
        </VaCardContent>
        <VaCardContent v-if="mapStore.hasCountries && showCountries">
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaSelect multiple v-model="mapStore.selectedCountries" :options="countries" :label="t('items.countries.title')">
                        <template #option="{ option }">
                            <div :class="[
                                'row option align-center justify-space-between',
                                typeof option === 'object' && option !== null && 'id' in option && mapStore.selectedCountries.map(({ id }) => id).includes(option.id)
                                    ? 'is-active'
                                    : ''
                            ]" @click="handleOption((option as any))">
                                <div v-if="typeof option === 'object' && option !== null && 'name' in option"
                                    class="flex">
                                    <p>{{ option.name }}</p>
                                </div>
                                <div v-if="typeof option === 'object' && option !== null && 'occurrences' in option"
                                    class="flex">
                                    <VaChip size="small">
                                        {{ option.occurrences }}
                                    </VaChip>
                                </div>
                            </div>
                        </template>
                        <template #content="{ value }">
                            <VaChip v-for="chip in value" :key="chip.id" size="small" class="mr-1 my-1">
                                {{ chip.name }}
                            </VaChip>
                        </template>
                    </VaSelect>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaButton @click="mapStore.showCountriesMap = !mapStore.showCountriesMap" block>
                        {{ mapStore.showCountriesMap ? 'Hide' : 'Show' }} Map</VaButton>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent v-if="showEBPMetrics">
            <div class="row align-center">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaCard outlined square>
                        <VaCardContent>
                            <span class="va-text-bold">{{ t('items.filters.ebpMetricsTitle') }}</span>
                            <p>{{ t('items.filters.ebpMetricsDescription') }}</p>
                            <VaDivider orientation="left"></VaDivider>
                            <div class="row">
                                <div class="flex">
                                    <CheckBox @valueChange="handleContigFilter" label="Contig N50 > 1MB"
                                        :value="contigFilter">

                                    </CheckBox>
                                </div>
                                <div class="flex">
                                    <CheckBox @valueChange="handleScaffoldFilter" label="Scaffold N50 > 10MB"
                                        :value="scaffoldFilter">

                                    </CheckBox>
                                </div>
                            </div>
                        </VaCardContent>
                    </VaCard>
                </div>
            </div>
        </VaCardContent>
        <VaModal v-model="showModal">
            <div class="layout va-gutter-5">

                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <h3 class="va-h3">{{ t('items.filters.modalTitle') }}</h3>
                        <p class="va-text-secondary">
                            {{ t('items.filters.modalDescription') }}
                            <code>parent.child.subchild</code>.
                        </p>
                    </div>
                </div>
                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <FieldLookup @field-exists="handleFieldExists" :model="model" />

                    </div>
                </div>
                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <VaSelect v-model="customFilter.type" :options="['select', 'input', 'range']"
                            :label="t('items.filters.selectLabel')">
                        </VaSelect>

                    </div>
                </div>
                <div class="row">
                    <div class="flex lg12 md12 sm12 xs12">
                        <VaButton :disabled="!customFilter.key" @click="addCustomFilter" block>
                           {{ t('items.filters.createBtn') }}</VaButton>

                    </div>
                </div>
            </div>

        </VaModal>
    </VaCard>

</template>
<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { DataModels, AppConfig, ConfigModel, ConfigFilter } from '../data/types'
import ModelFilters from '../components/ModelFilters.vue';
import { useItemStore } from '../stores/items-store';
import FieldLookup from '../components/FieldLookup.vue';
import CheckBox from '../components/inputs/CheckBox.vue';
import { useMapStore } from '../stores/map-store';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import { useToast } from 'vuestic-ui/web-components';
import { useI18n } from 'vue-i18n';


const { t } = useI18n()
const config = inject('appConfig') as AppConfig

const props = defineProps<{
    model: DataModels
}>()

const { init } = useToast()

const initCustomFilter =
    {
        key: '',
        type: 'input'
    } as ConfigFilter


const customFilter = ref<ConfigFilter>(
    {
        ...initCustomFilter
    }
)

const showModal = ref(false)
const ebpRelated = Boolean(config.general.ebp_related)
const showFilter = ref(false)

const showEBPMetrics = computed(() => props.model === 'assemblies' && ebpRelated)
const contigFilter = computed(() => itemStore.searchForm["metadata.assembly_stats.contig_n50__gt"] ? true : false)
const scaffoldFilter = computed(() => itemStore.searchForm["metadata.assembly_stats.scaffold_n50__gt"] ? true : false)

const itemStore = useItemStore()
const taxonomyStore = useTaxonomyStore()
const mapStore = useMapStore()
const otherParams = ["taxon_lineage", "sort_column", "sort_order"]
const countries = computed(() => mapStore.countries.map(({ countryName, occurrences, countryId }) => ({ id: countryId, name: countryName, occurrences: occurrences })))
const modelConfigs = computed(() => config.models[props.model] as ConfigModel)
const customFilters = computed(() => itemStore.customFilters)
const filters = computed(() => modelConfigs.value.filters ?? [])
const selectedCountries = computed(() => mapStore.selectedCountries)
const showCountries = computed(() => props.model === 'organisms' && config.general.showCountries)

const activeFilters = computed(() => Object.entries(itemStore.searchForm ?? {})
    .filter(([k, v]) => v && !otherParams.includes(k)))

watch(() => props.model, async () => {
    if (itemStore.model && props.model === itemStore.model) return
    itemStore.initStore(props.model)
    await handleUpdate()
}, { immediate: true })


watch(() => taxonomyStore.currentTaxon, async () => {
    await handleUpdate()
})

watch(() => mapStore.hasCountries, () => {
    if (!mapStore.hasCountries) {
        mapStore.selectedCountries = []
        mapStore.showCountriesMap = false
        itemStore.setSearchFormField('countries__in', null)
    }
})

async function handleUpdate() {
    const taxon_lineage = taxonomyStore.currentTaxon?.taxid
    itemStore.setSearchFormField('taxon_lineage', taxon_lineage)
    if (showCountries.value) {
        itemStore.setSearchFormField('countries__in', null)
        await mapStore.getCountries({ ...Object.fromEntries(activeFilters.value ?? []), taxon_lineage })
        mapStore.selectedCountries = []
    }
    await itemStore.handleQuery()
}

function handleFieldExists(v: string) {
    customFilter.value.key = v
}
function addCustomFilter() {
    itemStore.customFilters.push({ ...customFilter.value })
    customFilter.value = { ...initCustomFilter }
    showFilter.value = false
    init({ message: `Filter: ${customFilter.value.key} of type ${customFilter.value.type} added!`, color: 'success' })
}

async function handleOption(country: { id: string, name: string }) {
    const existingCountry = selectedCountries.value.find(c => c.id === country.id)
    if (existingCountry) mapStore.selectedCountries = [...mapStore.selectedCountries.filter(c => c.id !== country.id)]
    else mapStore.selectedCountries = [...mapStore.selectedCountries, country]
    itemStore.setSearchFormField('countries__in', mapStore.selectedCountries.map(({ id }) => id).join(','))
    await itemStore.handleQuery()
}

async function resetFilters() {
    itemStore.resetFilters()
    await handleUpdate()
}

async function handleScaffoldFilter(value: boolean) {
    await handleFilter(value, "metadata.assembly_stats.scaffold_n50__gt", 10000000);
}

async function handleContigFilter(value: boolean) {
    await handleFilter(value, "metadata.assembly_stats.contig_n50__gt", 1000000);
}

async function handleFilter(value: boolean, field: string, threshold: number) {
    if (value) {
        itemStore.setSearchFormField(field, threshold);
    } else {
        itemStore.setSearchFormField(field, false);
    }
    await itemStore.handleQuery();
}


</script>

<style scoped>
.option {
    cursor: pointer;
    padding: 5px;
}

.option:hover {
    background-color: #dee5f2;
    /* Background color on hover */
}

.is-active {
    background-color: #dee5f2;

}
</style>