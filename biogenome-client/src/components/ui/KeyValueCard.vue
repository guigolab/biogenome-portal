<template>
    <div class="row row-equal">
        <div class="flex" v-for="(mt, index) in selectedMetadata" :key="index">
            <va-card class="mb-4" :color="mt.color">
                <va-card-content>
                    <h2 class="va-h4 ma-0" style="color: white">{{ metadata[mt.key] }}</h2>
                    <p style="color: white">{{ t(mt.label) }}</p>
                </va-card-content>
            </va-card>
        </div>
    </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const props = defineProps<{
    selectedMetadata: Record<string,string>[]
    metadata:Record<string,any>
}>()
</script>