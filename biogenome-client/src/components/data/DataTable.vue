<template>
    <div class="row">
        <div style="overflow:scroll" class="flex lg12 md12 sm12 xs12">
            <va-data-table 
                :items="items"
                :columns="columns"
                :hoverable="true"
                sticky-header
                height="500px"
                :style="{
                    '--va-data-table-scroll-table-color': color,
                }"
                >
                <template #header(accession)>
                    accession
                </template>
                <template #header(metadata)>
                    metadata
                </template>
                <template #cell(accession)="{ rowData }">
                    <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${rowData.accession}`" class="link">{{rowData.accession}}</a>
                </template>
                <template #header(sub_samples)>related samples</template>
                <template #cell(chromosomes)="{ rowData }">
                    <va-button-dropdown v-if="rowData.chromosomes && rowData.chromosomes.length" size="small" flat :label="rowData.chromosomes.length">
                        <ul>
                            <li v-for="chr in rowData.chromosomes" :key="chr">
                                <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${chr}`" class="link">{{chr}}</a>
                            </li>
                        </ul>
                    </va-button-dropdown>
                </template>
                <template #cell(bioprojects)="{ rowData }">
                    <va-button-dropdown v-if="rowData.bioprojects && rowData.bioprojects.length" size="small" flat>
                        <ul>
                            <li v-for="pro in rowData.bioprojects" :key="pro">
                                <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${pro}`" class="link">{{pro}}</a>
                            </li>
                        </ul>
                    </va-button-dropdown>
                </template>
                <template #cell(experiments)="{ rowData }">
                    <va-button-dropdown v-if="rowData.experiments && rowData.experiments.length" size="small" flat>
                        <ul>
                            <li v-for="exp in rowData.experiments" :key="exp">
                                <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${exp}`" class="link">{{exp}}</a>
                            </li>
                        </ul>
                    </va-button-dropdown>
                </template>
                <template #cell(assemblies)="{ rowData }">
                    <va-button-dropdown v-if="rowData.assemblies && rowData.assemblies.length" size="small" flat>
                        <ul>
                            <li v-for="ass in rowData.assemblies" :key="ass">
                                <a target="_blank" :href="`https://www.ebi.ac.uk/ena/browser/view/${ass}`" class="link">{{ass}}</a>
                            </li>
                        </ul>
                    </va-button-dropdown>
                </template>

                <template #cell(sub_samples)="{ rowData }">
                    <va-button-dropdown v-if="rowData.sub_samples && rowData.sub_samples.length" size="small" flat>
                        <ul>
                            <li v-for="acc in rowData.sub_samples" :key="acc">
                                <a class="link">{{acc}}</a>
                            </li>
                        </ul>
                    </va-button-dropdown>
                </template>
                <template #cell(metadata)="{ rowData }"><va-icon name="search" :color="color" @click="toggleMetadata(rowData)"/></template>
            </va-data-table>
            <va-modal v-model="showMetadata" :title="toggledMetadata.name">
                <ul>
                    <li style="padding:10px" v-for="key in Object.keys(toggledMetadata.metadata)" :key="key">
                        <strong>{{key+ ': '}}</strong>{{toggledMetadata.metadata[key]}}
                        <va-divider/>
                    </li>
                </ul>
            </va-modal>
        </div>
    </div>
</template>
<script setup>
import {ref,reactive} from 'vue'

const showMetadata = ref(false)

const toggledMetadata = reactive({
    name:'',
    metadata:{}
})
const props = defineProps({
    items:Array,
    columns:Array,
    color: String
})

function toggleMetadata(rowData){
    toggledMetadata.name = rowData.accession || rowData.experiment_accession || rowData.local_id || rowData.name
    toggledMetadata.metadata = {...rowData.metadata}
    showMetadata.value = true    
}
</script>