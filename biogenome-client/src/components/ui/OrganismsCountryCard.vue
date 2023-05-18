<template>
  <va-card stripe :stripe-color="country.color">
    <va-card-title>
      <div class="row justify-space-between align-center">
        <div class="flex">
          {{ country.name }}
        </div>
        <div class="flex">
          <div class="row align-center">
            <div class="flex">
              <va-button
                preset="plain"
                :disabled="pagination.offset - pagination.limit < 0"
                size="small"
                icon="chevron_left"
                @click="handlePagination(pagination.offset - pagination.limit)"
              />
            </div>
            <div class="flex">
              {{ pagination.offset + 1 }}-{{
                pagination.limit > total
                  ? total
                  : pagination.limit + pagination.offset > total
                  ? total
                  : pagination.limit + pagination.offset
              }}
              of {{ total }}
            </div>
            <div class="flex">
              <va-button
                preset="plain"
                :disabled="pagination.offset + pagination.limit > total"
                size="small"
                icon="chevron_right"
                @click="handlePagination(pagination.offset + pagination.limit)"
              />
            </div>
          </div>
        </div>
      </div>
    </va-card-title>
    <va-card-content style="max-height: 50vh; overflow: scroll">
      <va-list>
        <va-list-item
          v-for="(organism, index) in organisms"
          :key="index"
          tag="li"
          :to="{ name: 'organism', params: { taxid: organism.taxid } }"
          class="list__item"
        >
          <va-list-item-section avatar>
            <va-avatar>
              <img :src="organism.image" size="large" />
            </va-avatar>
          </va-list-item-section>

          <va-list-item-section>
            <va-list-item-label>
              {{ organism.scientific_name }}
            </va-list-item-label>

            <va-list-item-label caption>
              {{ organism.insdc_common_name }}
            </va-list-item-label>
          </va-list-item-section>
          <va-list-item-section v-if="hasINSDCData(organism)" icon>
            <div v-if="organism.biosamples.length" style="padding: 5px">
              <va-icon style="padding;:5px" name="fa-vial" color="background-tertiary" size="small" />
            </div>
            <div v-if="organism.experiments.length" style="padding: 5px">
              <va-icon name="fa-file-lines" color="background-tertiary" size="small" />
            </div>
            <div v-if="organism.assemblies.length" style="padding: 5px">
              <va-icon name="fa-dna" color="background-tertiary" size="small" />
            </div>
          </va-list-item-section>
        </va-list-item>
      </va-list>
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
import OrganismService from '../../services/clients/OrganismService'
import { onMounted, ref,watch } from 'vue'

const props = defineProps<{
  country: {
    id: string
    color: string
    name: string
  }
}>()

watch(()=> props.country.id, async ()=>{
  pagination.value = {...initPagination}
  const { data } = await OrganismService.getOrganisms({ country: props.country.id, ...pagination.value })
  organisms.value = [...data.data]
  total.value = data.total
})

onMounted(async()=>{
  const { data } = await OrganismService.getOrganisms({ country: props.country.id, ...pagination.value })
  organisms.value = [...data.data]
  total.value = data.total
})
const organisms = ref([])
const total = ref(0)

const initPagination = {
  limit: 20,
  offset: 0,
}
const pagination = ref({ ...initPagination })

async function handlePagination(offset: number) {
  pagination.value.offset = offset
  const { data } = await OrganismService.getOrganisms({ country: props.country.id, ...pagination.value })
  organisms.value = [...data.data]
  total.value = data.total
}

function hasINSDCData(org) {
  return org.biosamples.length || org.experiments.length || org.assemblies.length
}
</script>