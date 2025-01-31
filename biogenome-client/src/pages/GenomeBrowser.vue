<template>
    <div>
        <div class="row">
            <div class="flex">
                <Header title-class="va-h1" description-class="va-text-secondary"
                    :title="t('genomeBrowser.title')" :description="t('genomeBrowser.description')"></Header>
            </div>
        </div>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaCard>
                    <VaCardContent>
                        <TaxonSearch />
                    </VaCardContent>
                </VaCard>
            </div>
        </div>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <GBFormCard />
            </div>
        </div>
        <div v-for="({ assembly, chromosomes, annotations, session }, index) in sessions"
            :key="`${assembly.accession}-${index}`" class="row">
            <div style="overflow: scroll;" class="flex lg12 md12 sm12">
                <GBSessionCard @on-delete="handleDelete(index)" :assembly="assembly" :chromosomes="chromosomes"
                    :session="session" :annotations="annotations" />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import Header from '../components/Header.vue';
import TaxonSearch from '../components/TaxonSearch.vue';
import { useGenomeBrowserStore } from '../stores/genome-browser-store';
import GBFormCard from '../components/GBFormCard.vue';
import GBSessionCard from '../components/GBSessionCard.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const gBStore = useGenomeBrowserStore()

const sessions = computed(() => gBStore.sessions)

function handleDelete(idx: number) {
    const { sessions } = gBStore
    gBStore.sessions = [...sessions.slice(0, idx).concat(sessions.slice(idx + 1))]
}

</script>