<template>
    <h4 class="va-h4">Chromosome Aliases file</h4>
    <p class="mb-4"> Upload a tab separated (.txt extension) file containing the name aliases of the chromosomes,
        for
        more
        info check <a target="_blank"
            href="https://jbrowse.org/jb2/docs/config_guides/assemblies/#configuring-reference-name-aliasing">HERE</a>
    </p>
    <va-form tag="form" @submit.prevent="handleSubmit">
        <va-card-content>
            <va-file-upload type="single" v-model="refName" dropzone drop-zone-text="Upload a .txt file"
                file-types=".txt" />
        </va-card-content>
        <va-card-actions align="between">
            <va-button type="reset" color="danger">Reset</va-button>
            <va-button type="submit">Submit</va-button>
        </va-card-actions>
    </va-form>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import AuthService from '../../../services/clients/AuthService';
import { useToast } from 'vuestic-ui/web-components';
import { AxiosError } from 'axios';
import { useRouter } from 'vue-router';


const router = useRouter()
const { init } = useToast()
const props = defineProps<{
    accession: string,
}>()

const isLoading = ref(false)
const refName = ref(undefined)


async function handleSubmit() {
    isLoading.value = true
    if (!refName.value) return
    try {
        const formData = new FormData()
        formData.append('chr_aliases', refName.value)
        const { data } = await AuthService.uploadRefNameAliases(props.accession, formData)
        init({ message: data as string, color: 'success' })
        router.push({ name: 'cms-assemblies' })
    } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.response && axiosError.response.data) {
            init({ message: axiosError.response.data as string, color: 'danger' })
        }
        console.log(error)
    } finally {
        isLoading.value = false
    }
}

</script>