<template>
  <va-card>
    <va-card-title>
      <div class="row align-center justify-space-between">
        <div class="flex">
          <h1>{{ t(title) }}</h1>
        </div>
        <div style="padding: 0" class="flex">
          <va-button
            :disabled="contributors.length <= step"
            preset="secondary"
            icon="chevron_right"
            @click="showNext"
          />
        </div>
      </div>
    </va-card-title>
    <va-card-content>
      <div v-for="(contributor, idx) in visibleList" :key="idx" class="mb-3">
        <va-progress-bar :model-value="getPercent(contributor.contributions)" color="primary">
          {{ contributor.contributions }} {{ model }}
        </va-progress-bar>
        <p class="mt-2">{{ contributor.name }}</p>
      </div>
    </va-card-content>
  </va-card>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { Contributor } from '../../data/types'
  import StatisticsService from '../../services/clients/StatisticsService'
  import { useI18n } from 'vue-i18n'

  const {t} = useI18n()
  const props = defineProps<{
    title: string
    model: string
    field: string
  }>()
  const contributors = ref<Contributor[]>([])
  const progressMax = ref(0)
  const visibleList = ref<Contributor[]>([])
  const step = ref(5)
  const page = ref(0)

  const emits = defineEmits(['listCreated'])

  onMounted(async () => {
    const { data } = await StatisticsService.getModelFieldStats(props.model, { field: props.field })
    getContributors(data)
    showNext()
  })

  function getContributors(data: Record<string,number>){
    contributors.value = Object.keys(data)
      .sort((a, b) => data[b] - data[a])
      .map((key: string) => {
        return {
          name: key,
          contributions: data[key],
        }
      })
    emits('listCreated', contributors.value)
    progressMax.value = Math.max(...contributors.value.map(({ contributions }) => contributions))
  }

  function getPercent(val: number) {
    return (val / progressMax.value) * 100
  }

  function showNext() {
    const start = page.value * step.value

    const end = page.value * step.value + step.value

    visibleList.value = contributors.value.slice(start, end)

    page.value += 1

    const maxPages = (contributors.value.length - 1) / step.value

    if (page.value > maxPages) {
      page.value = 0
    }
  }


</script>
