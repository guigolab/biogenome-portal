<template>
  <va-card>
    <va-tabs v-model="model" grow>
      <template #tabs>
        <va-tab v-for="model in models" :key="model" :name="model">
          {{ model }}
        </va-tab>
      </template>
    </va-tabs>
    <va-divider style="margin: 0" />
    <Transition>
      <va-card-content v-if="model === 'organisms'">
        <OrganismTable />
      </va-card-content>
      <va-card-content v-else-if="model === 'assemblies'">
        <AssemblyTable />
      </va-card-content>
      <va-card-content v-else-if="model === 'reads'">
        <ReadTable />
      </va-card-content>
      <va-card-content v-else-if="model === 'biosamples'">
        <BioSampleTable />
      </va-card-content>
      <va-card-content v-else-if="model === 'local_samples'">
        <LocalSampleTable />
      </va-card-content>
      <va-card-content v-else-if="model === 'annotations'">
        <AnnotationTable />
      </va-card-content>
      <va-card-content v-else-if="model === 'users'">
        <UserTable/>
      </va-card-content>
    </Transition>
  </va-card>
</template>
<script setup lang="ts">
  import { ref } from 'vue'

  import OrganismTable from './crud-tables/OrganismTable.vue'
  import AssemblyTable from './crud-tables/AssemblyTable.vue'
  import ReadTable from './crud-tables/ReadTable.vue'
  import LocalSampleTable from './crud-tables/LocalSampleTable.vue'
  import BioSampleTable from './crud-tables/BioSampleTable.vue'
  import AnnotationTable from './crud-tables/AnnotationTable.vue'
  import UserTable from './crud-tables/UserTable.vue'

  const model = ref('organisms')

  const models = ['organisms', 'assemblies', 'reads', 'biosamples', 'local_samples', 'annotations', 'users']


</script>
