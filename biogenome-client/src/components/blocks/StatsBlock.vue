<template>
    <div class="row">
        <div v-for="f in models" class="flex lg2 md2 sm6 xs6">
            <StatCard :icon="f.icon" :color="f.color" :count="f.count" :field="f.key" />
        </div>
    </div>
</template>
<script setup lang="ts">
import LookupService from '../../services/clients/LookupService';
import StatCard from '../../components/cards/StatCard.vue'
import { onMounted, reactive } from 'vue'
import pages from '../../../configs/pages.json'

const iconMap = {
    biosamples: { icon: 'fa-vial', color: 'success' },
    local_samples: { icon: 'fa-vial', color: 'warning' },
    experiments: { icon: 'fa-folder', color: 'info' },
    assemblies: { icon: 'fa-dna', color: 'primary' },
    annotations: { icon: 'fa-bars-staggered', color: 'secondary' },
    organisms: { icon: 'fa-paw', color: 'textPrimary' }
}

const MODELS = ['biosamples', 'local_samples', 'experiments', 'assemblies', 'annotations', 'organisms']

const models = reactive(getMappedModels())

onMounted(async () => {

    const { data } = await LookupService.lookupData()
    models.forEach(f => {
        if (data[f.key]) {
            f.count = data[f.key]
        }
    })
})

function getMappedModels() {
    const models = MODELS.filter(m => Object.keys(pages).includes(m))
    return models.map(m => {
        const key = m as keyof typeof iconMap
        const { icon, color } = iconMap[key]
        return {
            key: m,
            count: 0,
            icon,
            color
        }
    })
}
</script>