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
  import AssemblyService from '../../services/clients/AssemblyService'
  import BioSampleService from '../../services/clients/BioSampleService'
  import OrganismService from '../../services/clients/OrganismService'
  import ReadService from '../../services/clients/ReadService'
  import AnnotationService from '../../services/clients/AnnotationService'
  import LocalSampleService from '../../services/clients/LocalSampleService'
  import OrganismTable from './crud-tables/OrganismTable.vue'
  import AssemblyTable from './crud-tables/AssemblyTable.vue'
  import ReadTable from './crud-tables/ReadTable.vue'
  import LocalSampleTable from './crud-tables/LocalSampleTable.vue'
  import BioSampleTable from './crud-tables/BioSampleTable.vue'
  import AnnotationTable from './crud-tables/AnnotationTable.vue'
  import UserTable from './crud-tables/UserTable.vue'

  const model = ref('organisms')

  const models = ['organisms', 'assemblies', 'reads', 'biosamples', 'local_samples', 'annotations', 'users']

  const dataModels = [
    {
      label: 'Organisms',
      value: 'organisms',
      itemProvider: OrganismService.getOrganisms,
      columns: ['scientific_name', 'taxid', 'tolid_prefix', 'actions'],
      deleteAction: OrganismService.deleteOrganism,
      editable: true,
    },
    {
      label: 'BioSamples',
      value: 'biosamples',
      itemProvider: BioSampleService.getBioSamples,
      columns: ['accession', 'taxid', 'sub_samples', 'actions'],
      deleteAction: BioSampleService.deleteBioSample,
      editable: false,
    },
    {
      label: 'Reads',
      value: 'reads',
      itemProvider: ReadService.getReads,
      columns: ['experiment_accession', 'instrument_platform', 'taxid', 'actions'],
      deleteAction: ReadService.deleteRead,
      editable: false,
    },
    {
      label: 'Assemblies',
      value: 'assemblies',
      itemProvider: AssemblyService.getAssemblies,
      columns: ['accession', 'assembly_name', 'taxid', 'actions'],
      deleteAction: AssemblyService.deleteAssembly,
      editable: false,
    },
    // {label:'Annotations',value:'annotations', itemProvider: AnnotationService.getAnnotations,
    // columns:['name','assembly_accession','actions'],deleteAction: AnnotationService.deleteAnnotation,editable:true},
    // {label:'Local samples',value:'local_samples', itemProvider: LocalSampleService.getLocalSamples,
    // columns:['local_id','taxid','broker','actions'], deleteAction: LocalSampleService.deleteLocalSample,editable:false},
    // {label:'Genome Browser Data',value:'jbrowse', itemProvider: GenomeBrowserService.getGenomeBrowserData ,deleteAction: GenomeBrowserService.deleteGenomeBrowserData, columns:['assembly_accession','taxid','actions'], editable:true},
    // {label:'Portal Users',value:'users', itemProvider: UserService.getUsers,deleteAction: UserService.deleteUser,columns:['name','role','actions'],editable:true}
  ]
  const items = ref([])
  const total = ref(0)
</script>
