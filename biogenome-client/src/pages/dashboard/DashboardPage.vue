<template>
  <PageHeader :title="(page.title as LangOption)" :description="(page.description as LangOption)" />
  <div class="dashboard">
    <StatsBlock />

    <ChartsBlock source="dashboard" v-if="charts.length" :charts="charts" />
  </div>
</template>

<script setup lang="ts">
import ChartsBlock from '../../components/blocks/ChartsBlock.vue'
import StatsBlock from '../../components/blocks/StatsBlock.vue'
import { LangOption } from '../../data/types'
import PageHeader from '../../components/common/PageHeader.vue'
import { useConfig } from '../../composable/useConfig'

const { page, charts } = useConfig('dashboard')

</script>
<style lang="scss">
.row-equal .flex {
  .va-card {
    height: 100%;
  }
}

.dashboard {
  .va-card {
    margin-bottom: 0 !important;

    &__title {
      display: flex;
      justify-content: space-between;
    }
  }
}
</style>
