<template>
  <div class="row row-equal">
    <div v-for="(k, idx) in Object.keys(stats)" :key="idx" class="flex">
      <va-card :to="{name:k}" class="mb-4">
        <va-card-content>
          <h2 :style="{ color: colors.primary }" class="va-h2 ma-0" >{{ stats[k] }}</h2>
          <p>{{ k }}</p>
        </va-card-content>
      </va-card>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import StatisticsService from '../../services/clients/StatisticsService';
  import TaxonService from '../../services/clients/TaxonService';
  import { useColors } from 'vuestic-ui';

  const { colors } = useColors()

  const stats = ref({})
  const treeData = ref({})
  const showTree = ref(false)
  onMounted(async()=>{
    const {data} = await StatisticsService.getStats()
    stats.value = {...data}
    const response = await TaxonService.getTree('131567')
    treeData.value = {...response.data}
    showTree.value = true
  })

</script>

<style lang="scss" scoped>
  .row-separated {
    .flex + .flex {
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
