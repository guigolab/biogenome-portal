<template>
    <div>
        <div class="row">
            <div class="flex">
                <Header :title="title" />
            </div>
        </div>
        <VaInnerLoading :loading="statsStore.isLoading">
            <ModelCounts :counts="stats" adminArea />
            <div v-if="hasENATemplate" class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaCard>
                        <VaCardContent>
                            <div class="row">
                                <div class="flex">
                                    <h3 class="va-h3">
                                        EBI BioSamples Brokering Service
                                    </h3>
                                    <p class="va-text-secondary">
                                        Publish BioSamples to EBI
                                    </p>
                                </div>
                            </div>
                        </VaCardContent>
                        <VaCardContent>
                            <div class="row justify-space-between">
                                <div class="flex">
                                    <div class="row align-center">
                                        <div class="flex">
                                            Your submitted BioSamples:
                                        </div>
                                        <div class="flex">
                                            <VaChip flat :to="{ name: 'submitted-biosamples' }" size="large">
                                                {{ submittedBioSamplesCount }}
                                            </VaChip>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex">
                                    <VaButton :to="{ name: 'publish-biosample' }">Publish New BioSample</VaButton>
                                </div>
                            </div>
                        </VaCardContent>
                    </VaCard>
                </div>
            </div>
        </VaInnerLoading>
    </div>
</template>
<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { useGlobalStore } from '../../stores/global-store';
import Header from '../../components/cms/Header.vue';
import ModelCounts from '../../components/ModelCounts.vue';
import { VaInnerLoading } from 'vuestic-ui/web-components';
import { useStatsStore } from '../../stores/stats-store';
import EBIService from '../../services/EBIService';
import { AppConfig } from '../../data/types';


const globalStore = useGlobalStore()
const statsStore = useStatsStore()
const isAdmin = computed(() => globalStore.userRole === 'Admin')
const title = computed(() => !isAdmin.value ? 'Your Submissions' : 'Dashboard')
const stats = computed(() => isAdmin.value ? statsStore.portalStats : statsStore.userStats)
const submittedBioSamplesCount = ref(0)
const configs = inject('appConfig') as AppConfig

const hasENATemplate = computed(() => configs.general.enaTemplate)


onMounted(async () => {
    if (hasENATemplate.value) {
        const { data } = await EBIService.getSubmittedBioSamples({ user: globalStore.userName })
        submittedBioSamplesCount.value = data.total
    }

})

</script>