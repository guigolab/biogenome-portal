<template>
  <div class="target-list-status">
    <div class="chips-container">
      <VaDropdown v-for="status in statuses" :key="status.value" placement="bottom-start" stick-to-edges>
        <template #anchor>
          <VaChip color="backgroundElement">
            {{ status.value }}
            <span class="va-text-bold ml-2">
              {{ status.count }}
            </span>
          </VaChip>
        </template>
        <VaCard class="description-card">
          <VaCardContent>
            <p>{{ t(status.description) }}</p>
          </VaCardContent>
        </VaCard>
      </VaDropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  counts: Record<string, number>
}>();

const statuses = computed(() => [
  {
    value: 'long_list',
    description: 'targetListStatus.long_list.description',
    count: props.counts['long_list'] || 0,
    showDescription: ref(false)
  },
  {
    value: 'family_representative',
    description: 'targetListStatus.family_representative.description',
    count: props.counts['family_representative'] || 0,
    showDescription: ref(false)
  },
  {
    value: 'other_priority',
    description: 'targetListStatus.other_priority.description',
    count: props.counts['other_priority'] || 0,
    showDescription: ref(false)
  }
]);


</script>

<style lang="scss" scoped>
.target-list-status {
  padding: 1rem 0;
}

.ml-2 {
  margin-left: 0.5rem;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.description-card {
  max-width: 300px;
}

@media (max-width: 768px) {
  .chips-container {
    flex-direction: column;
    align-items: stretch;
  }

  .status-button {
    width: 100%;
  }
}
</style>