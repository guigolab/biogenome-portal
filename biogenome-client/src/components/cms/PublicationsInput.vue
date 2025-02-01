<template>
    <VaCard>
        <VaCardContent>
            <h2 class="va-h6">
                Publications
            </h2>
            <p class="va-text-secondary" v-for="p in publicationMessages">
                {{ p }}
            </p>
        </VaCardContent>
        <VaCardContent>
            <div v-for="(pub, index) in organismStore.publications" :key="index" class="row align-center">
                <div class="flex">
                    <VaSelect v-model="pub.source" innerLabel label="publication source"
                        :options="['DOI', 'PubMed ID', 'PubMed CentralID']"></VaSelect>
                </div>
                <div class="flex">
                    <VaInput v-model="pub.id" innerLabel label="publication id"
                        :rules="[(v: string) => v.length > 0 || 'id is mandatory', (v: string) => organismStore.publications.filter((p) => p.id === v).length === 1 || `Publication with ID: ${pub.id} already exists`]">
                    </VaInput>
                </div>
                <div class="flex">
                    <VaButton icon="fa-close" preset="secondary" color="danger"
                        @click="organismStore.publications.splice(index, 1)">Delete</VaButton>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaButton icon="add" @click="organismStore.publications.push({ id: '', source: '' })">Add new
                        publication</VaButton>
                </div>
            </div>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { useOrganismStore } from '../../stores/organism-store';


const organismStore = useOrganismStore()

const publicationMessages = [
    'DOI: enter the complete string, e.g., 10.1093/nar/gks1195',
    'PubMed ID (PMID): use simple numbers, e.g., 23193287',
    'PubMed CentralID (PMCID): include the PMC prefix, e.g., PMC3531190',
]


</script>