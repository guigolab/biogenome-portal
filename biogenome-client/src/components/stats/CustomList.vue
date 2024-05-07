<template>
    <va-card class="px-3">
        <va-card-title> {{ t(chart.title[locale]) }} </va-card-title>
        <va-card-content style="max-height: 350px; overflow: scroll">
            <va-list class="py-4">
                <template v-for="([key, value], index) in Object.entries(sortedData(data))" :key="index">
                    <va-list-item>
                        <va-list-item-section v-if="isHabitat" icon>
                            <va-icon size="large" color="info" :name="getIcon(key)" />
                        </va-list-item-section>
                        <va-list-item-section>
                            <va-list-item-label>
                                {{ key }}
                            </va-list-item-label>
                        </va-list-item-section>
                        <va-list-item-section icon>
                            <va-chip size="small">{{ value }}</va-chip>
                        </va-list-item-section>
                    </va-list-item>
                    <va-list-separator v-if="index < Object.keys(data).length - 1" :key="index" class="my-1" />
                </template>
            </va-list>
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import { defineProps } from 'vue';
import StatisticsService from '../../services/clients/StatisticsService'
import { useI18n } from 'vue-i18n'
import { InfoBlock } from '../../data/types';
const { t,locale } = useI18n()
const props = defineProps<{
    chart:InfoBlock,
    isHabitat?: boolean
}>()

const { data } = await StatisticsService.getModelFieldStats(props.chart.model, props.chart.field )

function sortedData(data: Record<string, number>): Record<string, number> {

    const sortedArray = Object.entries(data).sort((a, b) => b[1] - a[1])

    const sortedObject = Object.fromEntries(sortedArray)

    return sortedObject
}

function getIcon(habitat: string): string | undefined {
    const lowCase = habitat.toLowerCase()
    if (
        lowCase.includes('wood') ||
        lowCase.includes('leaves') ||
        lowCase.includes('tree') ||
        lowCase.includes('forest')
    )
        return 'forest'
    if (
        lowCase.includes('water') ||
        lowCase.includes('stream') ||
        lowCase.includes('aqua') ||
        lowCase.includes('marin') ||
        lowCase.includes('sea') ||
        lowCase.includes('wet') ||
        lowCase.includes('river')
    )
        return 'water'
    if (lowCase.includes('rock') || lowCase.includes('mount')) return 'landscape'
    if (lowCase.includes('wall') || lowCase.includes('city')) return 'apartment'

    if (
        lowCase.includes('garden') ||
        lowCase.includes('soil') ||
        lowCase.includes('botan') ||
        lowCase.includes('weed') ||
        lowCase.includes('grass')
    )
        return 'grass'
}
</script>