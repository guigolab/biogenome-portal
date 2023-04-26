<template>
  <va-card>
    <va-card-title> {{t('uiComponents.bioprojectsCard')}} </va-card-title>
    <va-card-content>
      <div v-for="(bp, index) in bioprojects" :key="index" style="padding: 0.5rem">
        <b class="display-6">{{ bp.title }}</b>
        <p>
          <va-chip size="small">{{ bp.accession }}</va-chip>
        </p>
      </div>
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const props = defineProps({
    bioprojects: Array,
  })
</script>
