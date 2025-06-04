<template>
    <div :class="['row', 'row-equal', 'model-counts-row']">
        <div v-for="({ count, icon, color, key }) in mappedCounts" :key="key" class="flex lg3 md4 sm12 xs12">
            <VaCard :to="{ name: 'model', params: { model: key } }" class="model-count-card">
                <VaCardContent>
                    <div class="model-count-content">
                        <div class="model-count-icon" :style="{ backgroundColor: `var(--va-${color})` }">
                            <VaIcon :color="'#fff'" :name="icon" size="32px" />
                        </div>
                        <Counter :duration="2000" :target-value="count" />
                        <div class="model-count-label">{{ t(`models.${key}`) }}</div>
                        <div class="model-count-desc">{{ t(modelDescriptions[key][locale] )}}</div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
    </div>
</template>
<script setup lang="ts">
import { AppConfig, Stat } from '../data/types';
import { iconMap } from '../composable/useIconMap';
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import Counter from './Counter.vue';

const appConfig = inject('appConfig') as AppConfig

const { t, locale } = useI18n()
const props = defineProps<{
    counts: Stat[],
}>()

const modelDescriptions = computed(() => Object.fromEntries(Object.entries(appConfig.models).map(([k, { title, description }]) => [k, description]).filter(([k, d]) => d)))

const mappedCounts = computed(() => props.counts.map(({ key, count }) => {
    const { icon, color } = iconMap[key]
    return { key, count, icon, color }
}).filter(({ key, count }) => count > 0 && Object.keys(modelDescriptions.value).includes(key)))


</script>

<style lang="scss" scoped>
.model-counts-row {
  gap: 2rem;
  justify-content: center;
}

.model-count-card {
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: box-shadow 0.2s, transform 0.2s;
  text-align: center;
  &:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.10);
    transform: translateY(-2px) scale(1.03);
  }
}

.model-count-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 0.5rem;
}

.model-count-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-bottom: 0.5rem;
  background: var(--va-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}

.model-count-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.model-count-label {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--va-text-primary);
  margin-bottom: 0.25rem;
}

.model-count-desc {
  font-size: 0.95rem;
  color: var(--va-text-secondary);
  margin-top: 0.25rem;
}

@media (max-width: 768px) {
  .model-counts-row {
    flex-direction: column;
    gap: 1.5rem;
  }
}
</style>