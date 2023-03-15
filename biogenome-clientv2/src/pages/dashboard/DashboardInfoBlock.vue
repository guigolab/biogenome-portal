<template>
  <div class="row row-equal">
    <div v-for="(k, idx) in Object.keys(stats)" :key="idx" class="flex">
      <va-card :to="{name:k}" class="mb-4">
        <va-card-content>
          <h2 class="va-h2 ma-0" >{{ stats[k] }}</h2>
          <p>{{ k }}</p>
        </va-card-content>
      </va-card>
    </div>
  </div>
        <!-- <div class="flex xs12 sm6 md6">
          <va-card>
            <va-card-content>
              <h2 class="va-h2 ma-0" :style="{ color: colors.primary }">291</h2>
              <p class="no-wrap">{{ t('dashboard.info.completedPullRequests') }}</p>
            </va-card-content>
          </va-card>
        </div> -->
        <!-- <div class="flex xs12 sm6 md6">
          <va-card>
            <va-card-content>
              <div class="row row-separated">
                <div class="flex xs4">
                  <h2 class="va-h2 ma-0 va-text-center" :style="{ color: colors.primary }">3</h2>
                  <p class="va-text-center">{{ t('dashboard.info.users') }}</p>
                </div>
                <div class="flex xs4">
                  <h2 class="va-h2 ma-0 va-text-center" :style="{ color: colors.info }">24</h2>
                  <p class="va-text-center no-wrap">{{ t('dashboard.info.points') }}</p>
                </div>
                <div class="flex xs4">
                  <h2 class="va-h2 ma-0 va-text-center" :style="{ color: colors.warning }">91</h2>
                  <p class="va-text-center">{{ t('dashboard.info.units') }}</p>
                </div>
              </div>
            </va-card-content>
          </va-card>
        </div> -->
    <!-- <div v-if="showTree" class="flex xl6 xs12 lg6">
      <va-card >
        <va-card-title>
          phylogenetic tree
        </va-card-title>
        <va-card-content style="height: 400px;overflow: scroll;">
          <IndentedTree :data="treeData"/>
        </va-card-content>
      </va-card>
    </div> -->


    <!-- <div class="flex xs12 sm6 md6 xl3 lg3">
      <va-card stripe stripe-color="info">
        <va-card-title>
          {{ t('dashboard.info.componentRichTheme') }}
        </va-card-title>
        <va-card-content>
          <p class="rich-theme-card-text">
            Buying the right telescope to take your love of astronomy to the next level is a big next step.
          </p>

          <div class="mt-3">
            <va-button color="primary" target="_blank" href="https://github.com/epicmaxco/vuestic-ui">
              {{ t('dashboard.info.viewLibrary') }}
            </va-button>
          </div>
        </va-card-content>
      </va-card>
    </div> -->

    <!-- <div class="flex xs12 sm6 md6 xl3 lg3">
      <va-card>
        <va-image :src="images[currentImageIndex]" style="height: 200px" />
        <va-card-title>
          <va-button preset="plain" icon-right="fa-arrow-circle-right" @click="showModal">
            {{ t('dashboard.info.exploreGallery') }}
          </va-button>
        </va-card-title>
      </va-card>
    </div> -->
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import StatisticsService from '../../services/clients/StatisticsService';
  import IndentedTree from '../organisms/IndentedTree.vue';
  import TaxonService from '../../services/clients/TaxonService';

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
