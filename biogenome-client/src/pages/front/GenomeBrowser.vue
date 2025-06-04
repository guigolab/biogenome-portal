<template>
    <div class="layout fluid va-gutter-5">
        <div class="row justify-space-between align-center">
            <div class="flex">
                <VaDropdown v-model="showFormDropdown" stick-to-edges
                    :close-on-content-click="false" placement="bottom-start">
                    <template #anchor>
                        <VaButton icon="fa-plus"> {{ t('genomeBrowser.addSession') }}
                        </VaButton>
                    </template>
                    <GBFormCard @close="showFormDropdown = false" />
                </VaDropdown>
            </div>
            <div class="flex">
                <div class="row">
                    <div class="flex">
                        <VaChip :disabled="sessions.length === 0" flat>Active sessions: {{ sessions.length }}</VaChip>
                    </div>
                    <div v-if="sessions.length > 0" class="flex">
                        <VaButton preset="primary" color="danger" icon="fa-trash" @click="handleDeleteAllSessions">Delete all sessions</VaButton>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="sessions.length === 0" class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaCard>
                    <VaCardContent>
                        <h3 class="va-h3">{{ t('genomeBrowser.assembly.modalTitle') }}</h3>
                        <p>{{ t('genomeBrowser.assembly.modelDescription') }}</p>
                        <VaChip style="margin-top: 10px;" outline target="_blank"
                            href="https://jbrowse.org/storybook/lgv/main/">
                            JBrowse Docs
                        </VaChip>
                        <div class="mt-4">
                            <VaButton color="primary" icon="fa-plus" @click="showFormDropdown = true">
                                {{ t('genomeBrowser.addSession') }}
                            </VaButton>
                        </div>
                    </VaCardContent>
                </VaCard>
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
import { ref, computed } from 'vue';
import { useGenomeBrowserStore } from '../../stores/genome-browser-store';
import GBFormCard from '../../components/GBFormCard.vue';
import GBSessionCard from '../../components/GBSessionCard.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const gBStore = useGenomeBrowserStore()
const showFormDropdown = ref(false)

const sessions = computed(() => gBStore.sessions)

function handleDelete(idx: number) {
    const { sessions } = gBStore
    gBStore.sessions = [...sessions.slice(0, idx).concat(sessions.slice(idx + 1))]
}

function handleDeleteAllSessions() {
    gBStore.sessions = []
}
</script>

<style lang="scss" scoped>
.hero-section {
    padding: 4rem 1rem 2rem 1rem;
    position: relative;
    overflow: hidden;
}

.hero-content {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
}

.search-container {
    margin: 2rem auto 0 auto;
    max-width: 800px;
    position: relative;
}

.search-wrapper {
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 0.5rem;
}

.mt-4 {
    margin-top: 1.5rem;
}

.mt-5 {
    margin-top: 2.5rem;
}
</style>