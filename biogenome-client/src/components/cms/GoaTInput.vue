<template>
    <VaCard>
        <VaCardContent>
            <h2 class="va-h6">
                GoaT Sequencing Status
            </h2>
            <p class="va-text-secondary">
                Insert information about the GoaT sequencing status and the GoaT target list status
            </p>
        </VaCardContent>
        <VaCardContent>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaSelect v-model="organismStore.organismForm.goat_status" label="Goat Status" :options="STATUS"
                        :disabled="organismStore.organismForm.goat_status === 'INSDC Submitted' ||
                            organismStore.organismForm.goat_status === 'Publication Available'
                            " clearable>
                    </VaSelect>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent v-if="currentStep">
            <p class="va-text-bold">{{ currentStep.value }}:</p>
            <p class="va-text-secondary">{{ t(currentStep.description) }}</p>
        </VaCardContent>
        <VaCardContent>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaSelect v-model="organismStore.organismForm.target_list_status" label="Target List Status"
                        :options="LIST" clearable>
                    </VaSelect>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent v-if="organismStore.organismForm.target_list_status">
            <p class="va-text-bold">{{ organismStore.organismForm.target_list_status }}:</p>
            <p class="va-text-secondary">{{ targetList[organismStore.organismForm.target_list_status] }}</p>
        </VaCardContent>
    </VaCard>

</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useOrganismStore } from '../../stores/organism-store';
import { computed } from 'vue';

const organismStore = useOrganismStore()
const STATUS = ['Sample Collected', 'Sample Acquired', 'Data Generation', 'In Assembly']
const LIST = ['long_list', 'family_representative', 'other_priority']
const { t } = useI18n()

const currentStep = computed(() => goatSteps.find(({ value }) => value === organismStore.organismForm.goat_status))

const goatSteps = [
    { value: 'Sample Collected', label: 'goat.collected.label', description: 'goat.collected.description' },
    { value: 'Sample Acquired', label: 'goat.acquired.label', description: 'goat.acquired.description' },
    { value: 'Data Generation', label: 'goat.generation.label', description: 'goat.generation.description' },
    { value: 'In Assembly', label: 'goat.assembly.label', description: 'goat.assembly.description' },
    { value: 'INSDC Submitted', label: 'goat.submitted.label', description: 'goat.submitted.description' },
    { value: 'Publication Available', label: 'goat.publication.label', description: 'goat.publication.description' },
]


const targetList = {
    long_list: "Any species declared as a target for the total scale of the project. For regional projects, this would declare that the species is known to be part of the biota of a region that is the target of this particular project(e.g.for DToL this is all UKSI plus the Irish biota, 72,000 species). For taxonomically- focussed species this would be all the species that are assigned to a particular higher taxon(e.g for VGP the long list is all 70,000 vertebrate species).",
    family_representative: "The species has been chosen as a family reference species for the organisation or project. These family representatives drive completion of the Earth BioGenome Project’s Phase 1 goals. Species tagged as 'family_representative' will also receive a long_list tag on GoaT.",
    other_priority: "A species that has been prioritised by a project for reasons other than being  a family representative. This could include for example species of primary conservation interest, species that are part of pilot projects, species that address goals beyond the EBP Phase 1 family representatives, and other subprojects. Species tagged as “other_priority” will also receive a long_list tag on GoaT.",
}
</script>