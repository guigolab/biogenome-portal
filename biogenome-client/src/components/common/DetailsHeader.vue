<template>
    <h1 class="va-h1">{{ details.title }}</h1>
    <p class="va-text-secondary" v-if="details.description">{{ details.description }}</p>
    <div class="row align-center">
        <div v-if="details.button1" class="flex">
            <va-button preset="primary" icon="pets" :to="details.button1.route">{{ details.button1.label
                }}</va-button>
        </div>
        <div v-if="details.button2" class="flex">
            <va-button :to="details.button2.route" preset="primary" icon="fa-vial">{{ details.button2.label
                }}</va-button>
        </div>
        <div v-if="details.blobtoolkit" class="flex">
            <va-button target="_blank"
                :href="`https://blobtoolkit.genomehubs.org/view/GCA_905340225.1/dataset/${details.blobtoolkit}/blob#Filters`"
                preset="primary" color="#9c528b" icon-right="arrow_forward">BlobToolKit</va-button>
        </div>
        <div v-if="details.ncbiPath" class="flex">
            <va-button target="_blank" :href="details.ncbiPath" preset="primary" icon-right="arrow_forward">{{
        t('buttons.NCBI') }}</va-button>
        </div>
        <div v-if="details.ebiPath" class="flex">
            <va-button target="_blank" :href="details.ebiPath" preset="primary" icon-right="arrow_forward">{{
        t('buttons.ENA')}}</va-button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Details } from '../../data/types';
import { useI18n } from 'vue-i18n';


const { t } = useI18n()

const props = defineProps<{ details: Details }>()

</script>