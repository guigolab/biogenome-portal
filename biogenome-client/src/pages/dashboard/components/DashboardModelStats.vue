<template>
  <div>
    <div v-if="isLoading" class="row row-equal">
      <div v-for="(m, idx) in models" :key="idx" class="flex">
        <va-skeleton class="stats-card-h" />
      </div>
    </div>
    <div v-else-if="errorMessage" class="row row-equal">
      <div class="flex">
        <va-card stripe-color="danger" stripe class="mb-4 stats-card-h">
          <va-card-content>
            {{ errorMessage }}
          </va-card-content>
        </va-card>
      </div>
    </div>
    <div v-else class="row row-equal">
      <div v-for="(m, idx) in stats" :key="idx" class="flex">
        <va-card :to="{ name: m.key }" class="mb-4 stats-card-h hover-shadow">
          <va-card-content>
            <h2 :style="{ color: colors.info }" class="va-h2 ma-0">{{ m.value }}</h2>
            <p>{{ t(m.label) }}</p>
          </va-card-content>
        </va-card>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StatisticsService from '../../../services/clients/StatisticsService';
import { useColors } from 'vuestic-ui';
import { useI18n } from 'vue-i18n'
import { dashboardModelStats } from '../../../../config.json'

const { t } = useI18n()

const { colors } = useColors()

const stats = ref<Record<string, any>[]>([])
const errorMessage = ref('')
const isLoading = ref(false)
const models = dashboardModelStats as Record<string, string>[]

onMounted(async () => {
  try {
    isLoading.value = true
    const { data } = await StatisticsService.getStats()
    stats.value = [
      ...models
        .filter(m => data[m.key])
        .map(m => {
          const valueToPush = { ...m }
          valueToPush.value = data[m.key]
          return valueToPush
        })
    ]
  } catch {
    errorMessage.value = 'Something went wrong'
  } finally {
    isLoading.value = false
  }

})

</script>

<style lang="scss" scoped>

.hover-shadow:hover{
box-shadow: rgba(0, 0, 0, 0.12) 0px 6px 10px 10px;
}
.stats-card-h {
  height: 125px;
}

.row-separated {
  .flex+.flex {
    border-left: 1px solid var(--va-background-primary);
  }
}

.rich-theme-card-text {
  line-height: 1.5;
}

.gallery-carousel {
  width: 80vw;
  max-width: 100%;

  @media all and (max-width: 576px) {
    width: 100%;
  }
}
</style>
