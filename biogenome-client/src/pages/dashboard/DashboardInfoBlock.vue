<template>
  <div class="row row-equal">
    <div v-for="(m, idx) in stats" :key="idx" class="flex">
      <va-card :to="{name: m.key}" class="mb-4">
        <va-card-content>
          <h2 :style="{ color: colors.info }" class="va-h2 ma-0" >{{ m.value }}</h2>
          <p>{{ m.label }}</p>
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
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()  

  const { colors } = useColors()

  const stats = ref([])
  const treeData = ref({})
  const showTree = ref(false)
  const models = [
    {
      label:t('modelStats.organisms'),
      key:"organisms"
    },
    {
      label:t('modelStats.biosamples'),
      key:"biosamples"
    },    
    {
      label:t('modelStats.localSamples'),
      key:"local_samples"
    },    
    {
      label:t('modelStats.assemblies'),
      key:"assemblies"
    },
    {
      label:t('modelStats.experiments'),
      key:"experiments"
    },
    {
      label:t('modelStats.annotations'),
      key:"annotations"
    }
  ]
  onMounted(async()=>{
    const {data} = await StatisticsService.getStats()

    models.forEach(m => {
      if(data[m.key]){
        const valueToPush = {...m}
        valueToPush.value = data[m.key]
        stats.value.push(valueToPush)
      }
    })
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
