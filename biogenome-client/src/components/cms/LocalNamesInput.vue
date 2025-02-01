<template>
    <VaCard>
        <VaCardContent>
            <h2 class="va-h6">
                Vernacular Names
            </h2>
            <p class="va-text-secondary">
                Add vernacular names
            </p>
        </VaCardContent>
        <VaCardContent>
            <div v-for="(name, index) in organismStore.vernacularNames" :key="index" class="row align-end">
                <div class="flex">
                    <VaInput v-model="name.lang" label="language"
                        :rules="[(v: string) => v.length > 0 || 'Language is mandatory']" />
                </div>
                <div class="flex">
                    <VaInput v-model="name.locality" label="locality"
                        :rules="[(v: string) => v.length > 0 || 'Locality is mandatory']"> </VaInput>
                </div>
                <div class="flex">
                    <VaInput v-model="name.value" label="value"
                        :rules="[(v: string) => v.length > 0 || 'Value is mandatory', (v: string) => organismStore.vernacularNames.filter(n => n.value === v).length === 1 || 'Value must be unique']">
                    </VaInput>
                </div>
                <div class="flex">
                    <VaButton color="danger" @click="organismStore.vernacularNames.splice(index, 1)">Delete</VaButton>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaButton icon="add"
                        @click="organismStore.vernacularNames.push({ value: '', lang: '', locality: '' })">Add
                        add local name</VaButton>
                </div>
            </div>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { useOrganismStore } from '../../stores/organism-store';

const organismStore = useOrganismStore()

</script>