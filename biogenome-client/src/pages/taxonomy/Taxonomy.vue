<template>
    <div class="row justify-space-between align-end">
        <div style="padding-top: 0;" class="flex lg8 md8 sm12 xs12">
            <h1 class="va-h1">{{ t('taxon.title') }}</h1>
            <p class="va-text-secondary">{{ t('taxon.description') }}</p>
        </div>
        <div class="flex">
            <va-button style="float: right;" color="secondary" icon="github"
                href="https://github.com/glouwa/d3-hypertree" target="_blank">
                GitHub
            </va-button>
        </div>
    </div>
    <VaDivider />
    <VaSplit class="split-demo" :limits="[10, 10]">
        <template #start>
            <div style="position: relative;">
                <div style="position: absolute;z-index: 1;width: 100%;">
                    <div class="row align-end">
                        <div class="flex lg12 md12 sm12 xs12">
                            <va-select hideSelected :loading="isLoading" dropdownIcon="search" searchable
                                highlight-matched-text :textBy="(v: TreeNode) => `${v.name} (${v.rank})`"
                                trackBy="taxid" @update:model-value="setCurrentTaxon" @update:search="handleSearch"
                                v-model="taxonomyStore.currentTaxon"
                                :searchPlaceholderText="t('taxon.search.placeholder')"
                                :noOptionsText="t('taxon.search.noOptions')" :options="taxons">
                                <template #append>
                                    <VaButton :round="false" @click="showModal = !showModal" color="warning">
                                        {{ t('taxon.related.button') }}
                                    </VaButton>
                                </template>
                            </va-select>
                            <a class="va-link" @click="router.push({ name: 'taxon', params: { taxid: rootNode } })"
                                flat>
                                {{ t('taxon.search.rootLoad') }}
                            </a>
                        </div>
                    </div>
                </div>
                <Suspense>
                    <template #fallback>
                        <va-skeleton height="100vh" />
                    </template>
                    <D3HyperTree @node-change="setCurrentTaxon" :filter="taxonomyStore.taxidQuery" />
                </Suspense>
            </div>
        </template>
        <template #end>
            <div style="position: relative;padding-left: 10px;">
                <div style="position: absolute;width: 100%;">
                    <router-view></router-view>
                </div>
            </div>
        </template>
    </VaSplit>
    <VaModal hide-default-actions overlay-opacity="0.2" v-model="showModal">
        <template #header>
            <h2 class="va-h2">{{ t('taxon.related.header') }}</h2>
            <p class="va-text-secondary">{{ t('taxon.related.description') }}</p>
        </template>
        <va-card-content style="padding-left: 0;">
            <va-inner-loading :loading="isLoading">
                <va-form tag="form" @submit.prevent="searchRelatedTaxon">
                    <div class="row align-center justify-start">
                        <va-input v-model="taxidInput" class="flex lg12 md12 sm12 xs12"
                            :placeholder="t('taxon.related.placeholder')" />
                    </div>
                    <va-card-actions align="left">
                        <va-button :disabled="taxidInput.length === 0" type="submit">{{ t('buttons.submit')
                            }}</va-button>
                        <va-button color="danger" @click="taxidInput = ''">
                            {{ t('buttons.reset') }}
                        </va-button>
                    </va-card-actions>
                </va-form>
            </va-inner-loading>
        </va-card-content>
    </VaModal>
</template>
<script setup lang="ts">
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import router from '../../router'
import { ref } from 'vue';
import TaxonService from '../../services/clients/TaxonService';
import { useI18n } from 'vue-i18n'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import { TreeNode } from '../../data/types';
import { AxiosError } from 'axios';
import { useToast } from 'vuestic-ui'


const rootNode = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'

const showModal = ref(false)

const taxidInput = ref('')

async function searchRelatedTaxon() {
    try {
        isLoading.value = !isLoading.value
        const { data } = await TaxonService.getPhylogeneticallyCloseTree(taxidInput.value)
        setCurrentTaxon(data)
        init({ message: `Closest taxon found: ${data.name}`, color: 'success' })
    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        isLoading.value = !isLoading.value
        showModal.value = !showModal.value
    }
}
const taxonomyStore = useTaxonomyStore()


const { init } = useToast()
const { t } = useI18n()

const taxons = ref<TreeNode[]>([])
const isLoading = ref(false)

function setCurrentTaxon(taxon: TreeNode) {
    taxons.value = []
    taxonomyStore.currentTaxon = { ...taxon }
    // taxonomyStore.taxidQuery = null
    taxonomyStore.taxidQuery = taxon.taxid
    router.push({ name: 'taxon', params: { taxid: taxon.taxid } })
}

async function handleSearch(v: string) {
    if (v.length < 2) return
    isLoading.value = true
    try {
        const { data } = await TaxonService.getTaxons({ filter: v })
        if (data.data) taxons.value = [...data.data]
    } catch (error) {
        console.log(error)
        const axiosError = error as AxiosError
        init({ message: axiosError.message, color: 'danger' })
    } finally {
        isLoading.value = false
    }
}


</script>

<style lang="scss">
.split-demo {
    height: 100vh;

}

.iframe-wrapper {
    position: relative;
    overflow: visible;
    height: 100vh;
}

.iframe-wrapper iframe {
    width: 100%;
    height: 100%;
}

.slide-bottom-enter-active .inner,
.slide-bottom-leave-active .inner {
    transition: transform .5s ease-out;
}

.slide-bottom-enter-from .inner,
.slide-bottom-leave-to .inner {
    transform: translateY(100%);
}
</style>