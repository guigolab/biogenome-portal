<template>
    <div>
        <div class="row align-end justify-space-between">
            <div class="flex">
                <Header title-class="va-h1" description-class="va-text-secondary" :title="t('genomeBrowser.title')"
                    :description="t('genomeBrowser.description')"></Header>
            </div>
            <div class="flex">
                <VaIcon @click="showTip = !showTip" color="info" name="fa-circle-question" />
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
        <VaModal v-model="showTip" ok-text="Ok">
            <h3 class="va-h3">
                {{ t('genomeBrowser.assembly.modalTitle') }}
            </h3>
            <p>
                {{ t('genomeBrowser.assembly.modelDescription') }}
            </p>
            <VaChip style="margin-top: 10px;" outline target="_blank" href="https://jbrowse.org/storybook/lgv/main/">
                JBrowse Docs</VaChip>
        </VaModal>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import Header from '../../components/Header.vue';
import TaxonSearch from '../../components/TaxonSearch.vue';
import { useGenomeBrowserStore } from '../../stores/genome-browser-store';
import GBFormCard from '../../components/GBFormCard.vue';
import GBSessionCard from '../../components/GBSessionCard.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const gBStore = useGenomeBrowserStore()

const showTip = ref(false)

const sessions = computed(() => gBStore.sessions)

function handleDelete(idx: number) {
    const { sessions } = gBStore
    gBStore.sessions = [...sessions.slice(0, idx).concat(sessions.slice(idx + 1))]
}

</script>