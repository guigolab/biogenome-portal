<template>
  <h1 class="va-h1">{{ t('maps.samples-map.title') }}</h1>
  <p class="va-text-secondary">{{ t('maps.samples-map.description') }}</p>
  <div style="height: 90vh;" class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <LeafletMap :lineage="rootNode" />
    </div>
  </div>
</template>
<script setup lang="ts">
import LeafletMap from '../../components/maps/LeafletMap.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'

</script>
