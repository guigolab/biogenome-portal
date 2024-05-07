<template>
    <va-card>
        <va-card-title>
            {{ t('tree.indented.title') }}
        </va-card-title>
        <va-card-content>
            <div class="row justify-space-between">
                <div class="flex">
                    {{ t('tree.indented.description') }}
                </div>
                <div class="flex">
                    <VaButtonDropdown hide-icon stickToEdges preset="plain">
                        <template #label>
                            <VaIcon name="info" class="info" size="small" />
                        </template>
                        <div style="width: 100px;">
                            <p>{{ t('tree.message') }}</p>
                        </div>
                    </VaButtonDropdown>
                    <b>{{ t('tree.last_update') }}:</b> {{ convertToDate(data.last_update) }}
                </div>
            </div>
        </va-card-content>
        <va-card-content class="chart" style="overflow: scroll;">
            <IndentedTree :data="data.tree" />
        </va-card-content>
    </va-card>
</template>

<script setup lang="ts">
import TaxonService from '../../../services/clients/TaxonService';
import IndentedTree from '../../../components/tree/IndentedTree.vue';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { data } = await TaxonService.getComputedTree()

interface DateObject {
    $date: number;
}

function convertToDate(dateObject: DateObject): string {
    const timestamp = dateObject.$date;
    const date = new Date(timestamp);

    // Create options object to format the date
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long', // Use month name
        day: '2-digit',
    };

    return date.toLocaleString(undefined, options);
}

</script>