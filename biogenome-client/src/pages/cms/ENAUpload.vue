<template>
    <div>
        <div class="row">
            <div class="flex">
                <h1 class="va-h1">
                    BioSample Creation
                </h1>
                <p class="va-text-secondary">
                    Fill the form and submit the biosample to EBI BioSamples, this biosample will become public and can be referenced by experiments and assemblies published to ENA or NCBI. Note that the portal retrieve the biosamples every weekend, so you biosample will be available in the portal after this time.
                </p>
            </div>
        </div>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaForm tag="form" ref="sampleForm">
                    <VaStepper @finish="submitSample" linear v-model="currentStep" :steps="steps">
                        <template #step-content-0>
                            <div class="row">
                                <div class="flex lg12 md12 sm12 xs12">
                                    <BioSampleIdentifiers />
                                </div>
                            </div>
                        </template>
                        <template #step-content-1>
                            <ENAChecklistForm v-if="checklist && currentStep === 1" :checklist="checklist" />
                            <CoordinatesPreview />
                        </template>
                        <template #step-content-2>
                            <div class="row">
                                <div v-if="sampleStore.validationErrors.length" class="flex lg12 md12 sm12 xs12">
                                    <div class="row">
                                        <div class="flex lg12 md12 sm12 xs12">
                                            <p class="va-text-bold va-text-danger">Validation Errors</p>
                                            <ol class="va-ordered">
                                                <li v-for="err in sampleStore.validationErrors">
                                                    {{ err }}
                                                </li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex lg12 md12 sm12 xs12">
                                    <VaInnerLoading :loading="sampleStore.loading">
                                        <BioSampleResume></BioSampleResume>
                                    </VaInnerLoading>
                                </div>
                            </div>
                        </template>
                    </VaStepper>
                </VaForm>
                <VaModal v-model="sampleStore.showModal" hide-default-actions no-outside-dismiss no-dismiss
                    no-esc-dismiss :close-button="false">
                    <template #header>
                        <h2 class="va-h3">BioSample Successfully Published</h2>
                    </template>
                    <p>{{ sampleStore.responseMessage }}</p>
                    <template #footer>
                        <div class="row justify-space-between">
                            <div class="flex">
                                <VaButton color="secondary" @click="goToSubmittedBioSamples">Go To My BioSamples
                                </VaButton>
                            </div>
                            <div class="flex">
                                <VaButton @click="newSubmission">Publish New BioSample</VaButton>
                            </div>
                        </div>
                    </template>
                </VaModal>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import BioSampleService from '../../services/BioSampleService';
import { defineVaStepperSteps, useForm } from 'vuestic-ui';
import ENAChecklistForm from '../../components/cms/ENAChecklistForm.vue';
import { useSampleStore } from '../../stores/sample-store';
import CoordinatesPreview from '../../components/cms/CoordinatesPreview.vue';
import BioSampleResume from '../../components/cms/BioSampleResume.vue';
import BioSampleIdentifiers from '../../components/cms/BioSampleIdentifiers.vue';
import { useRouter } from 'vue-router';

const checklist = ref<Record<string, any> | null>(null)

const sampleStore = useSampleStore()
const { validate } = useForm('sampleForm')
const router = useRouter()
const currentStep = ref(0)
const steps = ref(defineVaStepperSteps([
    {
        label: 'Sample Identifiers',
        beforeLeave: (step) => {
            step.hasError = !validate()
        }
    },
    {
        label: 'Sample Metadata',
        beforeLeave: (step) => {
            step.hasError = !validate()

        },
    },
    {
        label: 'Validate and Submit Sample',
    }
]))

onMounted(async () => {
    const { data } = await BioSampleService.getENAChecklist()
    checklist.value = { ...data.checklist }
    sampleStore.checklist = checklist.value?.identifiers?.primary_id?.text // set checklist identifier
})


async function submitSample() {
    await sampleStore.submitSample(fields.value)
}

const fields = computed(() => checklist.value?.descriptor.field_group.map((group: Record<string, any>) => {
    if (Array.isArray(group.field)) {
        return group.field.map((f: { name: { text: string }, units?: { unit: { text: string } } }) => ({ name: f.name.text, unit: f.units?.unit.text }))
    }
    return [{ name: group.field.name.text, unit: group.field.units?.unit.text }]
})?.flat())

function goToSubmittedBioSamples() {
    sampleStore.showModal = false
    router.push({ name: 'submitted-biosamples' })
}

function newSubmission() {
    sampleStore.sampleIdentifier = ""
    sampleStore.scientificName = ""
    sampleStore.taxid = ""
    currentStep.value = 0
    sampleStore.showModal = false
}
</script>