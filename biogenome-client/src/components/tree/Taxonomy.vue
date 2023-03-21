<template>
  <va-accordion v-model="value" popout flat>
    <va-collapse v-for="(rank, index) in taxonRanks" :key="index" :header="rank">
      <div>
        {{ collapse.content }}
      </div>
    </va-collapse>
  </va-accordion>
</template>
<script setup lang="ts">
  import TaxonService from '../../services/clients/TaxonService'
  import { ref, onMounted } from 'vue'
  import StatisticsService from '../../services/clients/StatisticsService'

  const value = ref([false, false, false, false, false, false, false, false])

  const ranks = ['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']

  const colors = ['#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec', '#c099b5', '#96ad9b', '#a3a0fa']

  const taxonRanks = ref([])

  onMounted(async () => {
    const { data } = await StatisticsService.getModelFieldStats('taxons', { field: 'rank' })
    taxonRanks.value = Object.keys(data)
      .filter((k) => ranks.includes(k))
      .map((k) => {
        return {
          name: k,
          value: data[k],
        }
      })
  })
</script>
