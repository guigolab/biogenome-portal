<template>
    <div class="row row-equal">
        <div v-for="(mt, index) in selectedMetadata.filter(mt => metadata[mt.key])" :key="index" class="flex">
            <va-card class="mb-4" :color="mt.color">
                <va-card-content>
                    <h2 class="va-h4 ma-0" style="color: white">{{ metadata[mt.key] }}</h2>
                    <p style="color: white">{{ mt.key }}</p>
                </va-card-content>
            </va-card>
        </div>
    </div>
</template>
<script setup lang="ts">


const props = defineProps<{
    selectedMetadata: Record<string, string>[]
    metadata: Record<string, any>
}>()
</script>