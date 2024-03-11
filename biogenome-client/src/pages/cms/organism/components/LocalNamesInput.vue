<template>
    <va-divider> Local Names </va-divider>
    <va-card-content>
        <div v-for="(name, index) in organismStore.vernacularNames" :key="index" class="row align-end">
            <div class="flex">
                <va-input v-model="name.lang" label="language"
                    :rules="[(v: string) => v.length > 0 || 'Language is mandatory']" />
            </div>
            <div class="flex">
                <va-input v-model="name.locality" label="locality"
                    :rules="[(v: string) => v.length > 0 || 'Locality is mandatory']"> </va-input>
            </div>
            <div class="flex">
                <va-input v-model="name.value" label="value"
                    :rules="[(v: string) => v.length > 0 || 'Value is mandatory', (v: string) => organismStore.vernacularNames.filter(n => n.value === v).length === 1 || 'Value must be unique']">
                </va-input>
            </div>
            <div class="flex">
                <va-icon name="delete" color="danger" @click="organismStore.vernacularNames.splice(index, 1)" />
            </div>
        </div>
        <va-button class="mt-3" icon="add"
            @click="organismStore.vernacularNames.push({ value: '', lang: '', locality: '' })">Add
            add local name</va-button>
    </va-card-content>
</template>
<script setup lang="ts">
import { useOrganismStore } from '../../../../stores/organism-store';

const organismStore = useOrganismStore()

</script>