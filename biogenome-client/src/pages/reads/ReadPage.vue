<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'reads' }" label="reads" />
      <va-breadcrumbs-item
        v-if="router.currentRoute.value.name === 'read'"
        active
        :label="router.currentRoute.value.params.accession"
      />
    </va-breadcrumbs>
    <va-divider />
    <ReadInfoBlock />
    <ReadListBlock />
  </div>
</template>
<script setup lang="ts">
  import { Contributor } from '../../data/types'
  import DateLineChart from '../../components/charts/DateLineChart.vue'
  import PieChart from '../../components/charts/PieChart.vue'
  import ContributorList from '../../components/stats/ContributorList.vue'
  import { useRouter } from 'vue-router'
  import { useReadStore } from '../../stores/read-store'
  import ReadInfoBlock from './ReadInfoBlock.vue'
  import ReadListBlock from './ReadListBlock.vue'

  const readStore = useReadStore()

  const router = useRouter()

  function getSubmitters(value: Contributor[]) {
    readStore.submitters = [...value]
  }
</script>

<style lang="scss">
  .chart {
    height: 400px;
  }
  .row-equal .flex {
    .va-card {
      height: 100%;
    }
  }
</style>
