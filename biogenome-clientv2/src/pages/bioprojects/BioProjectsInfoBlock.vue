<template>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card style="height: 100%">
        <va-card-title>organisms published by project</va-card-title>
        <va-card-content>
          <va-chart style="height: 350px" :options="chartOptions" :data="generateChartData()" type="doughnut" />
        </va-card-content>
      </va-card>
    </div>
    <div class="flex lg3 md3 sm12 xs12">
      <ContributorList :title="title" :data-type="dataType" :contributors="mapContributors()" />
    </div>
    <div v-if="bioprojects.length" class="flex xs12 sm6 md6 lg3 xl3">
      <va-carousel
        v-model="slide"
        style="justify-items: auto; align-items: unset"
        :indicators="false"
        height="100%"
        :items="bioprojects"
        infinite
      >
        <template #default="{ item }">
          <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
              <va-card-title>
                {{ item.title }}
              </va-card-title>
              <va-card-content>
                <va-chip outline size="small">{{ item.accession }}</va-chip>
              </va-card-content>
              <va-card-content>
                <div
                  v-for="(model, idx) in models.filter((m) => Object.keys(item).includes(m.id))"
                  :key="idx"
                  class="mb-3"
                >
                  <va-progress-bar :model-value="(item[model.id] / item.leaves) * 100" :color="model.color">
                    {{ `${item[model.id]} / ${item.leaves} ` }}
                  </va-progress-bar>
                  <p class="mt-2">{{ `Organisms with ${model.id}` }}</p>
                </div>
              </va-card-content>
            </div>
          </div>
        </template>
      </va-carousel>
    </div>
  </div>
</template>

<script setup lang="ts">
  import VaChart from '../../components/va-charts/VaChart.vue'
  import ContributorList from '../../components/stats/ContributorList.vue'
  import { BioProjectNode, Contributor } from '../../data/types'
  import models from '../../data/models'
  import { ref } from 'vue'
  const props = defineProps<{
    bioprojects: BioProjectNode[]
  }>()

  const slide = ref(0)

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 5,
          boxWidth: 20,
        },
      },
    },
  }

  const title = 'Assemblies published by project'

  const dataType = 'Assemblies'

  const primaryColorVariants = ['#2c82e0', '#ef476f', '#ffd166', '#06d6a0', '#8338ec']

  function mapContributors() {
    return props.bioprojects.map((project) => {
      const contributor: Contributor = {
        name: project.title,
        contributions: project.assemblies,
      }
      return contributor
    })
  }

  function generateChartData() {
    const chartData = {
      labels: props.bioprojects.map((project) => project.title),
      datasets: [
        {
          label: 'assemblies published by each project',
          backgroundColor: primaryColorVariants,
          data: props.bioprojects.map((ch) => ch.leaves),
        },
      ],
    }
    return chartData
  }
</script>
<style>
  .va-carousel__slide {
    align-items: unset !important;
    justify-items: auto;
  }
</style>
