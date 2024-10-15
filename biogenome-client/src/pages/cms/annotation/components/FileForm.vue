<template>
    <va-form tag="form" @submit.prevent="handleSubmit">
        <div class="row justify-center">
            <div class="flex">
                <va-button-toggle v-model="uploadMode" preset="secondary" border-color="primary"
                    :options="uploadModes" />
            </div>
        </div>
        <div class="row" v-if="uploadMode === 'links'">
            <va-input class="flex lg12 md12 xs12 sm12" :disabled="annotationStore.annotationForm.gzipAnnotation"
                v-model="annotationStore.annotationForm.gff_gz_location" label="gzipped gff3 url"
                :messages="['URL of the gzipped gff file']" />
            <va-input class="flex lg12 md12 xs12 sm12" :disabled="annotationStore.annotationForm.tabixAnnotation"
                v-model="annotationStore.annotationForm.tab_index_location" label="tabindexed gff3 url"
                :messages="['URL of the tabindexed gzipped gff file']" />
        </div>
        <div class="row" v-else>
            <div v-if="isLocalAssembly" class="flex lg12 md12 sm12 xs12">
                <p>
                    Update of uploaded files is not supported. If you need to change the file, it is necessary to delete
                    this
                    assembly
                    and create a new one
                </p>
            </div>
            <div v-else class="flex lg12 md12 sm12 xs12">
                <va-file-upload :disabled="isValid(annotationStore.annotationForm.gff_gz_location)" type="single"
                    v-model="annotationStore.annotationForm.gzipAnnotation" dropzone
                    drop-zone-text="Upload a gff gzipped file" file-types=".gz" />
                <va-file-upload :disabled="isValid(annotationStore.annotationForm.tab_index_location)" type="single"
                    v-model="annotationStore.annotationForm.tabixAnnotation" dropzone
                    drop-zone-text="Upload your GFF evidences" file-types=".tbi" />
            </div>

        </div>
        <va-divider>Extra Attributes</va-divider>
        <div v-for="(mt, index) in metadataList" :key="index" class="row align-center justify-between">
            <div class="flex lg8 md8 sm8 xs8">
                <va-input v-model="mt.key" label="attribute name" class="mt-3"
                    :error="metadataList.filter((m) => m.key === mt.key).length > 1"
                    :error-messages="[`Attribute name ${mt.key} is already present`]" />
                <va-input v-model="mt.value" label="attribute value" class="mt-3" type="textarea" />
            </div>
            <div class="flex">
                <va-button icon="delete" color="danger" @click="metadataList.splice(index, 1)">
                    Delete Attribute
                </va-button>
            </div>
        </div>
        <va-button class="mt-3" icon="add" @click="metadataList.push({ key: '', value: '' })">Add new
            attribute</va-button>
        <va-card-actions align="between">
            <va-button type="reset" color="danger" @click="resetForm">Reset</va-button>
            <va-button type="submit">Submit</va-button>
        </va-card-actions>
    </va-form>
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
const uploadMode = ref('files')
const uploadModes = [
    { label: 'Upload files', value: 'files' },
    { label: 'Insert links', value: 'links' },
]
const props = defineProps<{
    name?: string
}>()

const router = useRouter()
const emits = defineEmits(['onLoading'])

watch(() => props.name, (v) => {
    resetForm()
    if (props.name) {
        uploadMode.value = 'links'
    }
})

onMounted(async () => {
    if (props.name) {
        await retrieveAnnotation(props.name)
        uploadMode.value = 'links'
    }
})


const isLocalAssembly = ref(false)

const metadataList = ref<Record<string, string>[]>([])

function resetForm() {
    annotationStore.resetForm()
    metadataList.value = []
    isLocalAssembly.value = false
}

async function retrieveAnnotation(name: string) {

    try {
        const { data } = await AnnotationService.getAnnotation(name)
        isLocalAssembly.value = Boolean(data.external)
        Object.keys(data)
            .filter((k: string) => Object.keys(annotationStore.annotationForm).includes(k))
            .forEach((k) => {
                annotationStore.annotationForm[k] = data[k]
            })
        //parse metadata
        const parsedMetadata = Object.keys(data.metadata).map((k) => {
            return {
                key: k,
                value: data[k],
            }
        })
        if (parsedMetadata.length) {
            metadataList.value.push(...parsedMetadata)
        }
    } catch {
        init({ message: "Something happened, unable to retrieve annotation", color: 'danger' })
    }
}
async function handleSubmit() {
    if (!annotationStore.annotationForm.assembly_accession) {
        init({ message: "Select an assembly", color: 'danger' })
        return
    }
    //parse form data
    const requestData = parseRequestData()
    try {
        emits('onLoading', true)
        const { data } = props.name ? await AuthService.updateAnnotation(props.name, requestData) : await AuthService.createAnnotation(requestData)
        init({ message: data  + ' saved!', color: 'success' })
        router.push({name:'cms-assemblies'})
    } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.response && axiosError.response.data) {
            init({ message: axiosError.response.data as string, color: 'danger' })
        } else {
            init({ message: "Something happened", color: 'danger' })
        }
    } finally {
        emits('onLoading', false)
    }
}
function isValid(value: any) {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        // Value is considered empty, continue checking the rest of the object
        return false
    }
    // If a non-empty primitive value is found, return false
    return true;

}

function parseRequestData() {
    const metadata = Object.fromEntries(metadataList.value.filter((m) => m.key && m.value)
        .map(m => [m.key, m.value]))
    const request = new FormData()
    for (const [key, value] of Object.entries(annotationStore.annotationForm)) {
        if (value) {
            request.append(key, value);
        }
        for (const [k, v] of Object.entries(metadata)) {
            const keyName = `metadata.${k}`
            request.append(keyName, v)
        }
    }
    return request
}

</script>