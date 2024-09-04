<template>
    <div v-if="details" class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <h1 style="margin: 0;" class="va-h1">{{ details.title }}</h1>
            <p class="va-text-secondary" v-if="details.description">{{ details.description }}</p>
        </div>
        <div class="flex lg12 md12 sm12 xs12">
            <div class="row">
                <div v-if="details.button1" class="flex">
                    <va-button :round="false" preset="primary" icon="pets" :to="details.button1.route">{{
        details.button1.label
    }}</va-button>
                </div>
                <div v-if="details.button2" class="flex">
                    <va-button :round="false" :to="details.button2.route" preset="primary" icon="fa-vial">{{
        details.button2.label
    }}</va-button>
                </div>
                <div v-if="details.blobtoolkit" class="flex">
                    <va-button :round="false" target="_blank"
                        :href="`https://blobtoolkit.genomehubs.org/view/GCA_905340225.1/dataset/${details.blobtoolkit}/blob#Filters`"
                        preset="primary" color="#9c528b" icon-right="arrow_forward">BlobToolKit</va-button>
                </div>
                <div v-if="details.ncbiPath" class="flex">
                    <va-button :round="false" target="_blank" :href="details.ncbiPath" preset="primary"
                        icon-right="arrow_forward">{{
        t('buttons.NCBI') }}</va-button>
                </div>
                <div v-if="details.ebiPath" class="flex">
                    <va-button :round="false" target="_blank" :href="details.ebiPath" preset="primary"
                        icon-right="arrow_forward">{{
                        t('buttons.ENA') }}</va-button>
                </div>
            </div>
        </div>
    </div>
    <div v-else>
        <VaSkeletonGroup>
            <VaSkeleton tag="h1" variant="text" class="va-h1" />
            <VaSkeleton variant="text" :lines="1" />
        </VaSkeletonGroup>
    </div>
</template>
<script setup lang="ts">
import { Details } from '../../data/types';
import { useI18n } from 'vue-i18n';


const { t } = useI18n()

const props = defineProps<{ details?: Details }>()




</script>