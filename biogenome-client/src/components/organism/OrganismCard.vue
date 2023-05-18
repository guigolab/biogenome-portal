<template>
  <div v-if="Object.keys(organism).length">
    <va-card :to="{ name: 'organism', params: { taxid: organism.taxid } }">
      <va-card-block class="flex-nowrap" horizontal>
        <va-image fit v-if="organism.image" style="flex: 0 0 150px" :src="organism.image" />
        <div style="flex: auto">
          <va-card-content>
            <div class="row align-center">
              <div class="flex va-h6">
                {{ organism.scientific_name }}
              </div>
              <div v-if="organism.countries && organism.countries.length" class="flex">
                <div class="row">
                  <div v-for="country in organism.countries" :key="country" class="flex">
                    <va-icon :name="`flag-icon-${country.toLowerCase()} small`"></va-icon>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="organism.insdc_common_name" class="va-text-secondary">{{ organism.insdc_common_name }}</p>
          </va-card-content>
          <va-card-content>
            <va-button size="small">{{ t('buttons.view') }}</va-button>
          </va-card-content>
        </div>
        <va-card-actions v-if="hasINSDCData(organism)" vertical align="between" style="flex: 0 auto; padding: 0px">
          <va-button v-if="organism.assemblies.length" icon="fa-dna" plain />
          <va-button v-if="organism.biosamples.length" icon="fa-vial" plain />
          <va-button v-if="organism.experiments.length" icon="fa-file-lines" plain />
        </va-card-actions>
      </va-card-block>
    </va-card>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const props = defineProps({
  organism: Object,
})

function hasINSDCData(org) {
  return org.biosamples.length || org.experiments.length || org.assemblies.length
}
</script>
