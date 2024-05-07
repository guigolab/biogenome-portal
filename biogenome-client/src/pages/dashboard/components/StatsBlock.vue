<template>
    <div v-if="isLoading" class="row row-equal">
        <div v-for="([k, v], idx) in modelStats" :key="idx" class="flex">
            <VaSkeleton class="mb-4 stats-card-h" variant="squared" />
        </div>
    </div>
    <div v-else class="row row-equal">
        <div v-if="filteredStats.length" v-for="([k, v], idx) in modelStats.filter(([k, v]) => v)" :key="idx"
            class="flex">
            <va-card :to="{ name: k }" class="mb-4 stats-card-h hover-shadow">
                <va-card-content>
                    <h2 :style="{ color: colors.info }" class="va-h2 ma-0">{{ v }}</h2>
                    <p>{{ t(`sidebar.${k}`) }}</p>
                </va-card-content>
            </va-card>
        </div>
        <div v-else>
            <VaAlert color="danger" class="mb-6">
                {{ errorMessage || "Something happened" }}
            </VaAlert>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LookupService from '../../../services/clients/LookupService';
import { useColors } from 'vuestic-ui';
import { useI18n } from 'vue-i18n'
import { models } from '../../../../config.json'
import { AxiosError } from 'axios';

const { t } = useI18n()
const { colors } = useColors()
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const mappedModels = Object.keys(models).filter(k => k !== "status").map(k => {
    return {
        key: k,
        value: 0
    }
})

const modelStats = ref([...mappedModels.map(({ key, value }) => [key, value])])

const filteredStats = computed(() => {
    return modelStats.value.filter(([k, v]) => v)
})

onMounted(async () => {
    await getData()
})

async function getData() {
    try {
        isLoading.value = true
        const { data } = await LookupService.lookupData()
        const entries = Object
            .entries(data as Record<string, number>)
            .filter(([k, v]) => v)

        modelStats.value = [...entries]

    } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.code === "404") {
            errorMessage.value = "Not Found"
        } else {
            errorMessage.value = axiosError.message
        }
    } finally {
        isLoading.value = false
    }
}

</script>

<style lang="scss" scoped>
.hover-shadow:hover {
    box-shadow: rgba(0, 0, 0, 0.12) 0px 6px 10px 10px;
}

.stats-card-h {
    height: 125px;
}

.row-separated {
    .flex+.flex {
        border-left: 1px solid var(--va-background-primary);
    }
}
</style>