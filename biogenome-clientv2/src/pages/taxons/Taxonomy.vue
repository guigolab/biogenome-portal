<template>
  <div>
    <va-card-content v-for="(rank,index) in ranks" :key="index">
      <div class="row align-center">
          <div class="flex va-h6">
            {{ rank }}
          </div>
          <div class="flex">
            <va-chip size="small">{{ taxonRanks[rank] }}</va-chip>
          </div>
      </div>
    </va-card-content>
  </div>
</template>
<script setup lang="ts">
  import TaxonService from '../../services/clients/TaxonService'
  import { ref, onMounted, watch } from 'vue'
  import StatisticsService from '../../services/clients/StatisticsService'
  import { useTaxonomyStore } from '../../stores/taxonomy-store'

  const ranks = ['superkingdom', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'subspecies']

  const taxonomyStore = useTaxonomyStore()

  const taxonRanks = ref({})
  onMounted(async () => {
    const { data } = await StatisticsService.getModelFieldStats('taxons', { field: 'rank' })
    taxonRanks.value = {...data}
    taxonomyStore.ranks = Object.keys(data).map(k => k)
    
  })

</script>
