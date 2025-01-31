<template>
    <div class="row row-equal">
        <div v-for="({ count, icon, color, key }) in mappedCounts" class="flex lg4 md4 sm12 xs12">
            <VaCard :to="{ name: 'model', params: { model: key } }">
                <VaCardContent>
                    <div class="row align-center">
                        <div class="flex">
                            <VaButton size="large" :color="color" :icon="icon" preset="primary"></VaButton>
                            <!-- <VaIcon :color="color" :name="icon" size="large"></VaIcon> -->
                        </div>
                        <div class="flex">
                            <Counter :duration="2000" :target-value="count" />
                            <p> {{ t(`models.${key}`) }}

                            </p>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <Header :title="''" :title-class="''" description-class="va-text-secondary"
                        :description="(modelDescriptions[key] as any)" />
                </VaCardContent>
            </VaCard>
        </div>
    </div>
</template>
<script setup lang="ts">
import { AppConfig, Stat } from '../data/types';
import { iconMap } from '../composable/useIconMap';
import { computed, inject } from 'vue';
import Counter from './Counter.vue';
import Header from './Header.vue';
import { useI18n } from 'vue-i18n';

const appConfig = inject('appConfig') as AppConfig


const { t } = useI18n()
const props = defineProps<{
    counts: Stat[]
}>()

const modelDescriptions = computed(() => Object.fromEntries(Object.entries(appConfig.models).map(([k, { title, description }]) => [k, description]).filter(([k, d]) => d)))

const mappedCounts = computed(() => props.counts.map(({ key, count }) => {
    const { icon, color } = iconMap[key]
    return { key, count, icon, color }
}).filter(({ key, count }) => count > 0 && Object.keys(modelDescriptions.value).includes(key)))


</script>