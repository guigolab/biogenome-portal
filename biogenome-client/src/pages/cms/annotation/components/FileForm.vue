<template>
    <!-- Toggle Upload Mode -->
    <div class="row justify-center">
        <div class="flex">
            <va-button-toggle v-model="uploadMode" preset="secondary" border-color="primary" :options="uploadModes" />
        </div>
    </div>

    <!-- Upload Mode: Links -->
    <div class="row" v-if="uploadMode === 'links'">
        <va-input class="flex lg12 md12 xs12 sm12" :disabled="annotationStore.annotationForm.gzipAnnotation"
            v-model="annotationStore.annotationForm.gff_gz_location" label="gzipped gff3 url"
            :messages="['URL of the gzipped gff file']" />
        <va-input class="flex lg12 md12 xs12 sm12" :disabled="annotationStore.annotationForm.tabixAnnotation"
            v-model="annotationStore.annotationForm.tab_index_location" label="tabindexed gff3 url"
            :messages="['URL of the tabindexed gzipped gff file']" />
    </div>

    <!-- Upload Mode: Files -->
    <div class="row" v-else>
        <div v-if="name" class="flex lg12 md12 sm12 xs12">
            <p>
                Update of uploaded files is not supported. If you need to change the file, it is necessary to delete
                this
                annotation and create a new one.
            </p>
        </div>
        <div v-else class="flex lg12 md12 sm12 xs12">
            <va-file-upload :disabled="isInputDisabled(annotationStore.annotationForm.gff_gz_location)" type="single"
                v-model="annotationStore.annotationForm.gzipAnnotation" dropzone
                drop-zone-text="Upload a gzipped GFF file" file-types=".gz" />
            <va-file-upload :disabled="isInputDisabled(annotationStore.annotationForm.tab_index_location)" type="single"
                v-model="annotationStore.annotationForm.tabixAnnotation" dropzone
                drop-zone-text="Upload the GFF tabix index file" file-types=".tbi" />
        </div>
    </div>

    <!-- Extra Attributes Section -->
    <va-divider>Extra Attributes</va-divider>
    <div v-for="(mt, index) in metadataList" :key="index" class="row align-center justify-between">
        <div class="flex lg8 md8 sm8 xs8">
            <va-input v-model="mt.key" label="Attribute name" class="mt-3" :error="isDuplicateAttribute(mt.key)"
                :error-messages="[`Attribute name '${mt.key}' is already present`]" />
            <va-input v-model="mt.value" label="Attribute value" class="mt-3" type="textarea" />
        </div>
        <div class="flex">
            <va-button icon="delete" color="danger" @click="removeAttribute(index)">
                Delete Attribute
            </va-button>
        </div>
    </div>

    <!-- Add New Attribute Button -->
    <va-button class="mt-3" icon="add" @click="addNewAttribute">Add new attribute</va-button>

    <!-- Form Actions -->
    <va-card-actions align="between">
        <va-button color="danger" @click="resetForm">Reset</va-button>
        <va-button @click="handleSubmit">Submit</va-button>
    </va-card-actions>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useToast } from 'vuestic-ui'
import { useAnnotationStore } from '../../../../stores/annotation-store'
import AuthService from '../../../../services/clients/AuthService'
import AnnotationService from '../../../../services/clients/AnnotationService'
import { AxiosError } from 'axios'
import { useRouter } from 'vue-router'

const { init } = useToast()
const annotationStore = useAnnotationStore()
const uploadMode = ref<'files' | 'links'>('files')
const uploadModes = [
    { label: 'Upload files', value: 'files' },
    { label: 'Insert links', value: 'links' },
]
const router = useRouter()
const emits = defineEmits(['onLoading'])

const isLocal = ref(false)
const metadataList = ref<{ key: string, value: any }[]>([])

const props = defineProps<{ name?: string }>()

watch(() => props.name, async (name) => {
    resetForm()
    if (name) {
        uploadMode.value = 'links'
        await retrieveAnnotation(name)
    }
})

// Initialize the component when mounted
onMounted(async () => {
    if (props.name) {
        await retrieveAnnotation(props.name)
        uploadMode.value = 'links'
    }
})

// Reset form and metadata list
function resetForm() {
    annotationStore.resetForm()
    metadataList.value = []
    isLocal.value = false
}

// Retrieve annotation data for the form
async function retrieveAnnotation(name: string) {
    try {
        const { data } = await AnnotationService.getAnnotation(name)
        isLocal.value = Boolean(data.external)

        Object.entries(data).forEach(([key, value]) => {
            if (key in annotationStore.annotationForm) {
                annotationStore.annotationForm[key] = value
            }
        })

        // Parse metadata
        metadataList.value = Object.entries(data.metadata || {}).map(([key, value]) => ({ key, value }))
    } catch {
        init({ message: "Unable to retrieve annotation data.", color: 'danger' })
    }
}

// Handle form submission
async function handleSubmit() {
    if (!annotationStore.annotationForm.assembly_accession) {
        init({ message: "Please select an assembly.", color: 'danger' })
        return
    }

    const requestData = parseRequestData()

    try {
        emits('onLoading', true)
        const { data } = props.name
            ? await AuthService.updateAnnotation(props.name, requestData)
            : await AuthService.createAnnotation(requestData)

        init({ message: `${data} saved successfully!`, color: 'success' })
        router.push({ name: 'cms-annotations' })
    } catch (error) {
        handleError(error)
    } finally {
        emits('onLoading', false)
    }
}

// Parse form data to be sent
function parseRequestData() {
    const metadata = Object.fromEntries(
        metadataList.value.filter(m => m.key && m.value).map(m => [m.key, m.value])
    )

    const request = new FormData()

    for (const [key, value] of Object.entries(annotationStore.annotationForm)) {
        if (value) {
            request.append(key, value)
        }
    }

    Object.entries(metadata).forEach(([key, value]) => {
        request.append(`metadata.${key}`, value)
    })

    return request
}

// Error handling for Axios responses
function handleError(error: unknown) {
    const axiosError = error as AxiosError
    const errorMessage = axiosError.response?.data as string || "Something went wrong."
    init({ message: errorMessage, color: 'danger' })
}

// Add a new attribute
function addNewAttribute() {
    metadataList.value.push({ key: '', value: '' })
}

// Remove an attribute
function removeAttribute(index: number) {
    metadataList.value.splice(index, 1)
}

// Check if an attribute name is duplicate
function isDuplicateAttribute(key: string): boolean {
    return metadataList.value.filter(m => m.key === key).length > 1
}

// Validate input disabling logic
function isInputDisabled(value: any) {
    return !!value
}

</script>