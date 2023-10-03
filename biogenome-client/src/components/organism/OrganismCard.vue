<template>
  <va-card style="height:100%" :to="{ name: 'organism', params: { taxid: data.taxid } }">
    <va-list-item class="list__item">
      <va-list-item-section avatar>
        <va-avatar size="large">
          <img :src="data.image" />
        </va-avatar>
      </va-list-item-section>

      <va-list-item-section>
        <va-list-item-label>
          <div class="row align-center">
            <div class="flex">
              {{ data.scientific_name }}
            </div>
            <div v-if="data.countries && data.countries.length" class="flex">
              <div class="row">
                <div v-for="country in data.countries" :key="country" class="flex">
                  <va-icon :name="`flag-icon-${country.toLowerCase()} small`" color="warning" />
                </div>
              </div>
            </div>
          </div>
        </va-list-item-label>
        <va-list-item-label v-if="data.insdc_common_name" caption>
          {{ data.insdc_common_name }}
        </va-list-item-label>
        <va-list-item-label> </va-list-item-label>
      </va-list-item-section>
      <va-list-item-section icon>
        <va-icon class="ml-4" v-if="data.biosamples.length" name="fa-vial" color="background-tertiary" />
        <va-icon class="ml-4" v-if="data.assemblies.length" name="fa-dna" color="background-tertiary" />
        <va-icon class="ml-4" v-if="data.experiments.length" name="fa-file-lines" color="background-tertiary" />

      </va-list-item-section>
    </va-list-item>
  </va-card>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import OrganismService from '../../services/clients/OrganismService'
const { t } = useI18n()

const props = defineProps<{
  taxid: string
}>()


const { data } = await OrganismService.getOrganism(props.taxid)


</script>
<style>
.w-100 {
  width: 100px;
}
</style>