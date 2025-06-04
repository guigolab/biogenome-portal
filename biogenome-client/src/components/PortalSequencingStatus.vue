<template>
        <div style="overflow: scroll;">
        <div class="steps-container">
            <VaStepper
              :vertical="isMobile"
              controls-hidden
              :steps="reactiveSteps"
              class="org-status-stepper"
            >
              <template v-for="(step, i) in reactiveSteps" :key="step.label" #[`step-button-${i}`]>
                <div class="step-content">
                    <VaCard 
                        style="max-width: 300px; transition: transform 0.2s ease, box-shadow 0.2s ease;"
                        class="status-card"
                        @mouseenter="$event.currentTarget.style.transform = 'translateY(-2px)'"
                        @mouseleave="$event.currentTarget.style.transform = 'translateY(0)'"
                    >
                        <VaCardContent class="pa-4">
                            <div class="row align-center justify-space-between">
                                <div class="flex">
                                    <div class="row align-center">
                                        <div v-if="step.icon" class="flex">
                                            <VaButton  size="large" :color="step.color" :icon="step.icon" preset="primary">

                                            </VaButton>
                                        </div>
                                        <div class="flex">
                                            <Counter 
                                                :target-value="step.count" 
                                                :duration="1000"
                                                custom-class="va-h4"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-column">
                                    <h3 class="va-h6">{{ t(step.label) }}</h3>
                                    <p class="va-text-secondary text-sm">{{ t(step.description) }}</p>
                                </div>
                            </div>
                        </VaCardContent>
                    </VaCard>
                </div>
              </template>
            </VaStepper>
            </div>
        </div>
  </template>
  
  <script setup lang="ts">
  import { computed, ref, onUnmounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import Counter from './Counter.vue';
  const { t } = useI18n();
  
  const props = defineProps<{
    steps: {
      label: string,
      description: string,
      value: string,
      count: number,
      icon?: string,
      color?: string
    }[],
  }>();
  
  // Add computed property for reactive steps
  const reactiveSteps = computed(() => props.steps.map(step => ({
    ...step,
    count: step.count
  })));

  // Responsive: vertical on mobile, horizontal on desktop
  const isMobile = ref(window.innerWidth <= 768);

  // Use a debounced resize handler for better performance
  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      isMobile.value = window.innerWidth <= 768;
    }, 100);
  });

  // Clean up event listener
  onUnmounted(() => {
    window.removeEventListener('resize', () => {});
    clearTimeout(resizeTimeout);
  });

  </script>
  
  <style lang="scss" scoped>
  .pa-4 {
    padding: 0.5rem;
  }

  .org-status-stepper {
    display: flex;
    flex-direction: row;
    align-items: stretch;
  }

  .org-status-stepper .step-content {
    display: flex;
    align-items: stretch;
    gap: 0.75rem;
    flex-wrap: wrap;
    height: 100%;
  }

  .count-chip {
    margin-left: 0.5rem;
  }

  @media (max-width: 768px) {
    .org-status-stepper {
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .org-status-stepper .step-content {
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      width: 100%;
    }

    .status-card {
      width: 100%;
      max-width: 300px;
    }
  }

  .status-card {
    background: var(--va-background-primary);
    border: 1px solid var(--va-background-border);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .status-card .va-card__content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .status-card .row {
    flex: 1;
  }

  .status-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .text-sm {
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .steps-container {
    overflow-x: auto;
    width: max-content;
    padding: 1rem 2rem;
    margin: 0 auto;
    scrollbar-width: thin;
    -ms-overflow-style: none;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      background: var(--va-background-element);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--va-background-border);
      border-radius: 3px;

      &:hover {
        background: var(--va-primary);
      }
    }

    @media (max-width: 768px) {
      width: 100%;
      overflow-x: visible;
      padding: 1rem 0.5rem;
    }
  }
  </style>