<template>
  <div class="hero-section" :class="{ 'home-hero': isHome }">
    <div class="hero-content">
      <Header 
        :title="title" 
        :description="description" 
        :title-class="titleClass"
        :description-class="descriptionClass" 
      />
      <VaAffix class="search-affix" :offset-top="100" @change="handleAffixChange">
        <div class="search-wrapper" :class="{ 'is-affixed': isAffixed }">
          <TaxonSearch />
        </div>
      </VaAffix>
      <TaxonRanks v-if="isHome" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { LangOption } from '../data/types'
import Header from './Header.vue'
import TaxonSearch from './TaxonSearch.vue'
import { ref } from 'vue'
import { useTaxonomyStore } from '../stores/taxonomy-store'
import TaxonRanks from './TaxonRanks.vue'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{
  title: string | LangOption
  description: string | LangOption
  isHome?: boolean
  titleClass?: string
  descriptionClass?: string
}>(), {
  titleClass: 'va-h1',
  descriptionClass: 'va-text-secondary'
})

const { t } = useI18n()
const taxonomyStore = useTaxonomyStore()
const isAffixed = ref(false)

const handleAffixChange = (affixed: any) => {
  isAffixed.value = affixed.value
}
</script>

<style lang="scss" scoped>
.hero-section {
  padding: 4rem 1rem 1rem 1rem;
  position: relative;
  overflow: hidden;
  &.home-hero {
    background: linear-gradient(to bottom, var(--va-background-primary), var(--va-background-secondary));
    margin-bottom: 3rem;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at top right, rgba(var(--va-primary-rgb), 0.1), transparent 70%);
      pointer-events: none;
    }
  }
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  position: relative;
}

.hero-content > *:not(:first-child):not(h1):not(p) {
  margin-top: 2rem;
}


.search-wrapper {
  max-width: 800px;
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  background: var(--va-background-element);

  &.is-affixed {
    max-width: 600px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    padding: 0.35rem;
  }
}

.search-affix {
  z-index: 101;
  position: relative
}

@media (max-width: 768px) {
  .hero-section {
    padding: 3rem 1rem;
  }
  
  .hero-content > *:not(:first-child) {
    margin-top: 1.5rem;
  }
  
  .search-wrapper {
    &.is-affixed {
      max-width: 90%;
      padding: 0.25rem;
    }
  }
}
</style> 