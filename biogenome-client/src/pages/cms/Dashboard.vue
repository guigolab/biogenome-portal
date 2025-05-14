<template>
    <div>
        <div class="row">
            <div class="flex">
                <Header :title="title" />
            </div>
        </div>
        <VaInnerLoading :loading="statsStore.isLoading">
            <div class="row row-equal">
                <div class="flex flex-grow" v-for="{ icon, color, key, count } in mappedCounts" :key="key">
                    <VaCard>
                        <VaCardContent>
                            <div class="row justify-space-between align-center">
                                <div class="flex">
                                    <div class="row align-center">
                                        <div class="flex">
                                            <VaButton size="large" :color="color" :icon="icon" preset="primary">
                                            </VaButton>
                                        </div>
                                        <div class="flex">
                                            <h3 class="va-h5">
                                                My {{ key }}
                                            </h3>
                                            <p class="va-text-secondary">
                                                List of assigned {{ key }}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex">
                                    <VaButton size="small" :color="color" preset="primary" round>{{ count }} {{ key }}
                                    </VaButton>
                                </div>
                            </div>
                        </VaCardContent>
                        <VaCardContent>
                            <div class="row justify-space-between">
                                <div class="flex">
                                    <VaButton :to="{ name: 'cms-items', params: { model: key } }" color="textPrimary"
                                        preset="secondary" icon-right="fa-arrow-right">View
                                    </VaButton>
                                </div>
                                <div v-if="key === 'organisms'" class="flex">
                                    <VaButton :to="{ name: 'create-organism' }" icon="fa-plus" preset="primary">New
                                        Organism</VaButton>
                                </div>
                                <div v-else-if="key === 'annotations'" class="flex">
                                    <VaButton :to="{ name: 'create-annotation' }" icon="fa-plus" preset="primary">New
                                        Annotation</VaButton>
                                </div>
                            </div>
                        </VaCardContent>
                    </VaCard>
                </div>
                <div v-if="submittedBioSamplesCount" class="flex flex-grow">
                    <VaCard>
                        <VaCardContent>
                            <div class="row justify-space-between align-center">
                                <div class="flex">
                                    <div class="row align-center">
                                        <div class="flex">
                                            <VaButton size="large" color="success" icon="fa-vial" preset="primary">
                                            </VaButton>

                                        </div>
                                        <div class="flex">
                                            <h3 class="va-h5">
                                                My EBI BioSamples
                                            </h3>
                                            <p class="va-text-secondary">
                                                List of your BioSamples published to EBI
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex">
                                    <VaButton size="small" color="success" preset="primary" round>{{
                                        submittedBioSamplesCount }} BioSamples
                                    </VaButton>
                                </div>
                            </div>
                        </VaCardContent>
                        <VaCardContent>
                            <div class="row justify-space-between">
                                <div class="flex">
                                    <VaButton block :to="{ name: 'submitted-biosamples' }" color="textPrimary"
                                        preset="secondary" icon-right="fa-arrow-right">View
                                    </VaButton>
                                </div>
                                <div class="flex">
                                    <VaButton preset="primary" icon="fa-plus" :to="{ name: 'publish-biosample' }"> New
                                        BioSample
                                    </VaButton>
                                </div>
                            </div>
                        </VaCardContent>
                    </VaCard>
                </div>
                <div class="flex lg4 md6 sm12 xs12" v-if="!submittedBioSamplesCount && !stats.length">
                    <VaCard>
                        <VaCardContent>
                            <div class="row">
                                <div class="flex">
                                    <h3 class="va-h5">
                                        No Data Available
                                    </h3>
                                    <p class="va-text-secondary">
                                        It looks like there are no items created yet. Use the buttons below to quickly
                                        add
                                        new objects and get started. Choose from different types to begin building your
                                        data.
                                    </p>
                                </div>
                            </div>
                        </VaCardContent>
                        <VaCardContent>
                            <div class="row">
                                <div class="flex">
                                    <VaButton :to="{ name: 'create-organism' }" icon="fa-plus" preset="primary">New
                                        Organism</VaButton>
                                </div>
                                <div class="flex">
                                    <VaButton preset="primary" icon="fa-plus" :to="{ name: 'publish-biosample' }">
                                        New EBI
                                        BioSample
                                    </VaButton>
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
import { VaInnerLoading } from 'vuestic-ui/web-components';
import { useStatsStore } from '../../stores/stats-store';
import EBIService from '../../services/EBIService';
import { AppConfig } from '../../data/types';
import { iconMap } from '../../composable/useIconMap';


const globalStore = useGlobalStore()
const statsStore = useStatsStore()
const isAdmin = computed(() => globalStore.userRole === 'Admin')
const title = computed(() => !isAdmin.value ? 'My Data' : 'Dashboard')
const stats = computed(() => isAdmin.value ? statsStore.portalStats : statsStore.userStats)

const mappedCounts = computed(() => stats.value
    .filter(({ key, count }) => count > 0 || key === 'organisms')
    .map(({ key, count }) => {
        const { icon, color } = iconMap[key]
        return { key, count, icon, color }
    }))

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