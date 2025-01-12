<template>
    <div class="row">
        <div class="flex">
            <div style="margin-bottom: 4px;" >
                <span class="va-text-bold"> Publication id Rules</span>
            </div>
            <div style="margin-bottom: 2px;">
                <p class="va-text-secondary"  v-for="p in publicationMessages">
                {{ p }}
            </p>
            </div>
        </div>
    </div>
    <div v-for="(pub, index) in organismStore.publications" :key="index" class="row align-center">
        <div class="flex">
            <va-select v-model="pub.source" innerLabel label="publication source"
                :options="['DOI', 'PubMed ID', 'PubMed CentralID']"></va-select>
        </div>
        <div class="flex">
            <va-input v-model="pub.id" innerLabel label="publication id"
                :rules="[(v: string) => v.length > 0 || 'id is mandatory', (v: string) => organismStore.publications.filter((p) => p.id === v).length === 1 || `Publication with ID: ${pub.id} already exists`]">
            </va-input>
        </div>
        <div class="flex">
            <va-button color="danger" @click="organismStore.publications.splice(index, 1)">Delete</va-button>
        </div>
    </div>
    <div class="row">
        <div class="flex">
            <va-button icon="add" @click="organismStore.publications.push({ id: '', source: '' })">Add new
                publication</va-button>
        </div>
    </div>

</template>
<script setup lang="ts">
import { useOrganismStore } from '../stores/organism-store';


const organismStore = useOrganismStore()

const publicationMessages = [
    'DOI: enter the complete string, e.g., 10.1093/nar/gks1195',
    'PubMed ID (PMID): use simple numbers, e.g., 23193287',
    'PubMed CentralID (PMCID): include the PMC prefix, e.g., PMC3531190',
]


</script>