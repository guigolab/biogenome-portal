<template>
    <section class="row">
        <div v-for="f in mappedModels" class="flex lg2 md2 sm6 xs6">
            <VaCard :to="{ name: f.key }" class="hover-shadow">
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex">
                            <Counter :duration="2000" :target-value="f.count" />
                            <p> {{ t(`sidebar.${f.key}`) }}
                            </p>
                        </div>
                        <div class="flex">
                            <VaIcon :color="f.color" :name="f.icon" size="large"></VaIcon>
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
    </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { iconMap } from '../composable/useIconMap';
import { useStatsStore } from '../stores/stats-store';
import Counter from '../components/common/Counter.vue'
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const statsStore = useStatsStore()
const { t } = useI18n()

const router = useRouter()

const routes = computed(() => router.getRoutes().filter(f => f.name))

const mappedModels = computed(() => {
    const models = statsStore.currentStats.filter(({ key, count }) => {

        return routes.value.find(r => r.name === key) && count > 0
    }).map(({ key, count }) => {
        const { icon, color } = iconMap[key]
        return { key, count, icon, color }
    })
    return models
})

</script>
<style scoped>
.hover-shadow:hover {
    box-shadow: rgba(0, 0, 0, 0.12) 0px 6px 10px 10px;
}
</style>