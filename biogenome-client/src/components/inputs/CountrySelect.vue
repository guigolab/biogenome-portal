<template>
    <VaSelect label="Country" clearable dropdownIcon="search" searchable highlight-matched-text textBy="name"
        trackBy="id" v-model="country" :searchPlaceholderText="'Type here to search..'"
        :placeholder="t('taxon.search.placeholder')" :noOptionsText="t('taxon.search.noOptions')" :options="options">
        <template #option="{ option, selectOption }">
            <div class="row option align-center justify-space-between" @click="selectOption(option)">
                <div class="flex">
                    <p>{{ option.name }}</p>
                </div>
                <div class="flex">
                    <VaChip color="secondary" size="small">
                        {{ option.value }}
                    </VaChip>
                </div>
            </div>
        </template>
    </VaSelect>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n'
import { useItemStore } from '../../stores/items-store';
import am5geodata_worldHigh from '@amcharts/amcharts5-geodata/worldLow'

const itemStore = useItemStore()
const { t } = useI18n()

const defaultModel = 'organisms'
const defaultField = 'countries'

const countryIndex = computed(() => itemStore.frequencies.findIndex(({ source, model, field }) => model === defaultModel && source === defaultModel && field === defaultField))

const options = computed(() => {
    if (countryIndex.value === -1) return []
    const freq = itemStore.frequencies[countryIndex.value]
    return am5geodata_worldHigh.features
        .filter(({ id }) => id && Object.keys(freq.data).includes(id.toString()))
        .map(({ properties, id }) => {
            const name = properties ? properties.name : id
            const value = id ? freq.data[id.toString()] : 0
            return { name, id, value }
        })
})

const country = computed({
    get() {
        return itemStore.country
    }, async set(country: { name: string, id: string } | null) {
        itemStore.country = country
        await itemStore.handleQuery(defaultModel)
    }
})


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
</style>
