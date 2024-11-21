<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <Hero :title="(page.title as LangOption)" :description="(page.description as LangOption)" />
    <!-- Stats Section -->
    <!-- <section class="stats-section">
      <h2 class="section-title">App Statistics</h2>
      <div class="dashboard">
        <div class="row">
          <div v-for="f in mappedModels" :key="f.key" class="flex lg2 md2 sm6 xs6">
            <VaCard :to="{ name: f.key }" class="hover-shadow">
              <VaCardContent>
                <div class="row justify-space-between align-center">
                  <div class="flex">
                    <Counter :duration="2000" :target-value="f.count" />
                    <p>{{ t(`sidebar.${f.key}`) }}</p>
                  </div>
                  <div class="flex">
                    <VaIcon :color="f.color" :name="f.icon" size="large" />
                  </div>
                </div>
              </VaCardContent>
            </VaCard>
          </div>
        </div>
      </div>
    </section>

    <section class="charts-section">
      <h2 class="section-title">Data Visualizations</h2>
      <div class="row  ">
        <div v-for="(chart, index) in charts" :key="`${index}-${chart.model}-${chart.field}`" :class="chart.class">
          <ChartCard :source="source" :chart="chart" :index="index" />
        </div>
      </div>
    </section>

    <section class="features-section">
      <h2 class="section-title">App Features</h2>
      <ul class="feature-list">
        <li v-for="(feature, index) in features" :key="index" class="feature-item">
          <VaIcon :name="feature.icon" size="large" />
          <div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
          </div>
        </li>
      </ul>
    </section> -->
  </div>
</template>

<script setup lang="ts">
import ChartsBlock from '../../components/blocks/ChartsBlock.vue'
import StatsBlock from '../../components/blocks/StatsBlock.vue'
import { LangOption } from '../../data/types'
import PageHeader from '../../components/common/PageHeader.vue'
import { useConfig } from '../../composable/useConfig'
import Hero from '../../sections/Hero.vue'

const { page, charts } = useConfig('dashboard')


const props = {

}

</script>

<style scoped>


.landing-page {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

/* Hero Section */
.hero-section {
  text-align: center;
  padding: 3rem 1.5rem;
  background-color: #f7f9fc;
}

.app-logo {
  width: 100px;
  height: auto;
  margin-bottom: 1rem;
}

.cta-buttons {
  margin-top: 1.5rem;
}

.cta-button {
  margin: 0 0.5rem;
}

/* Stats Section */
.stats-section {
  padding: 2rem 1.5rem;
  background-color: #ffffff;
}

/* Charts Section */
.charts-section {
  padding: 2rem 1.5rem;
  background-color: #f7f9fc;
}

/* Features Section */
.features-section {
  padding: 2rem 1.5rem;
  background-color: #ffffff;
}

.section-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  text-align: center;
}

.feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  max-width: 300px;
  background-color: #f7f7f7;
  text-align: left;
}

.feature-title {
  font-weight: bold;
  margin: 0;
}

.feature-description {
  margin: 0;
  color: #666;
}
</style>
