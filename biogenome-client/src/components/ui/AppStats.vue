<template>
    <div class="row">
        <div v-for="f in filteredModels" class="flex lg2 md2 sm6 xs6">
            <va-card :to="{ name: f.key }" class="hover-shadow">
                <va-card-content>
                    <div class="row justify-space-between align-center">
                        <div class="flex">
                            <Counter :duration="2000" :target-value="f.count" />
                            <p> {{ f.text }}
                            </p>
                        </div>
                        <div class="flex">
                            <VaIcon :color="f.color" :name="f.icon" size="large"></VaIcon>
                        </div>
                    </div>
                </va-card-content>
            </va-card>
        </div>
    </div>
</template>
<script setup lang="ts">
import Counter from '../common/Counter.vue'
import LookupService from '../../services/clients/LookupService';
import { onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { models } from '../../../config.json'

const { t } = useI18n()

type DataModel = "organisms" | "assemblies" | "biosamples" | "experiments" | "annotations" | "local_samples"

const iconMap = {
    biosamples: { icon: 'fa-vial', color: 'success' },
    local_samples: { icon: 'fa-vial', color: 'warning' },
    experiments: { icon: 'fa-folder', color: 'info' },
    assemblies: { icon: 'fa-dna', color: 'primary' },
    annotations: { icon: 'fa-bars-staggered', color: 'secondary' },
    organisms: { icon: 'fa-paw', color: 'textPrimary' }
}

const filteredModels = reactive(
    Object.keys(models)
        .filter(m => m !== 'status')
        .map(m => {
            const { icon, color } = iconMap[m as DataModel]
            return {
                key: m,
                text: t(`sidebar.${m}`),
                count: 0,
                icon,
                color
            }
        })
)


onMounted(async () => {
    const { data } = await LookupService.lookupData()
    filteredModels.forEach(f => {
        if (data[f.key]) {
            f.count = data[f.key]
        }
    })
})


</script>
<style scoped>
.hover-shadow:hover {
    box-shadow: rgba(0, 0, 0, 0.12) 0px 6px 10px 10px;
}
</style>