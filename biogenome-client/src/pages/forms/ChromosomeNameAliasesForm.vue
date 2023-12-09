<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-card>
                <va-inner-loading :loading="isLoading">
                    <va-form tag="form" @submit.prevent="handleSubmit">
                        <va-card-content>
                            Upload a tab separated (.txt extension) file containing the name aliases of the chromosomes, for
                            more
                            info check <a target="_blank"
                                href="https://jbrowse.org/jb2/docs/config_guides/assemblies/#configuring-reference-name-aliasing">HERE</a>
                        </va-card-content>
                        <va-card-content>
                            <va-file-upload type="single" v-model="refName" dropzone drop-zone-text="Upload a .txt file"
                                file-types=".txt" />

                        </va-card-content>
                        <va-card-actions align="between">
                            <va-button type="reset" color="danger">Reset</va-button>
                            <va-button type="submit">Submit</va-button>
                        </va-card-actions>
                    </va-form>
                </va-inner-loading>
            </va-card>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import AuthService from '../../services/clients/AuthService';

const props = defineProps<{
    accession: string,
}>()

const isLoading = ref(false)
const refName = ref(undefined)


async function handleSubmit(){
    isLoading.value = true
    if(!refName.value)return
    try{
        const formData = new FormData()
        formData.append('chr_aliases', refName.value)
        const {data} = await AuthService.uploadRefNameAliases(props.accession, formData)
        console.log(data)
    }catch(error){
        console.log(error)
    }finally{
        isLoading.value = false
    }
}

</script>