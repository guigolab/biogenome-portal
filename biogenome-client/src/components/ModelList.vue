<template>
    <VaCollapse v-model="isExpanded" :header="t('taxon.relatedData')">
        <div class="model-list-wrapper">
            <div v-for="({ key, count }) in modelList" :key="key" class="model-item">
                <div class="model-line" :class="{ 'active': key === modelParam }">
                    <router-link :to="{ name: 'model', params: { model: key } }" class="model-name">
                        {{ t(`models.${key}`) }}
                    </router-link>
                    <span class="model-count">
                        {{ count }}
                    </span>
                </div>
            </div>
        </div>
    </VaCollapse>
</template>

<script setup lang="ts">
import { computed, inject, watchEffect, ref } from 'vue';
import { useStatsStore } from '../stores/stats-store';
import { useRoute } from 'vue-router';
import { AppConfig } from '../data/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const route = useRoute()
const appConfig = inject('appConfig') as AppConfig
const isExpanded = ref(true)

const implementedModels = computed(() => Object.keys(appConfig.models))
const modelParam = computed(() => route.params.model)
const statsStore = useStatsStore()
const props = defineProps<{
    taxid: string
}>()

const modelList = computed(() => statsStore.currentStats.filter(({ key, count }) => count > 0 && implementedModels.value.includes(key)))

watchEffect(async () => {
    await statsStore.getTaxonStats(props.taxid)
})
</script>

<style lang="scss" scoped>
.model-list-wrapper {
    padding: 0.5rem 0;
}

.model-item {
    margin: 0.5rem 0;
}

.model-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    white-space: nowrap;

    &:hover {
        background-color: var(--va-background-primary);
        color: var(--va-primary);
        font-weight: bold;
    }

    &.active {
        background-color: var(--va-background-primary);
        font-weight: bold;
        color: var(--va-primary);
    }
}

.model-name {
    color: inherit;
    text-decoration: none;
    flex: 1;

    &:hover {
        text-decoration: underline;

    }
}

.model-count {
    color: var(--va-text-secondary);
    font-size: 0.9em;
    margin-left: 0.25rem;
}
</style>