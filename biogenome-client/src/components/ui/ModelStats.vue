<template>
  <div class="row row-equal">
    <div v-for="([k, v], idx) in filteredStats" :key="idx" class="flex">
      <va-card :to="{ name: k }" class="mb-4 stats-card-h hover-shadow">
        <va-card-content>
          <h2 :style="{ color: colors.info }" class="va-h2 ma-0">{{ v }}</h2>
          <p>{{ t(`sidebar.${k}`) }}</p>
        </va-card-content>
      </va-card>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import LookupService from '../../services/clients/LookupService';
import { useColors } from 'vuestic-ui';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { colors } = useColors()
const { data } = await LookupService.lookupData()

const filteredStats = computed(() => {
  return Object.entries(data).filter(([k, v]) => v)
})

</script>

<style lang="scss" scoped>
.hover-shadow:hover {
  box-shadow: rgba(0, 0, 0, 0.12) 0px 6px 10px 10px;
}

.stats-card-h {
  height: 125px;
}

.row-separated {
  .flex+.flex {
    border-left: 1px solid var(--va-background-primary);
  }
}
</style>