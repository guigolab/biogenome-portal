<template>
    <VaCard>
        <VaCardContent>
            <div class="row align-center justify-space-between">
                <div class="flex">
                    <h3 class="va-h6"> {{ t(title) }}</h3>
                </div>
                <div class="flex">
                    <VaButton color="textPrimary" preset="secondary" @click="showDetails = !showDetails">{{showDetails?'Hide':'Show'}} Details</VaButton>
                </div>
            </div>
        </VaCardContent>
        <VaCardContent>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <p class="va-text-secondary">{{ t('item.status') }} <VaChip size="small" outline color="textPrimary"> {{
                        currentStatus }}
                        </VaChip>
                    </p>
                </div>
                <div v-if="targetList" class="flex lg12 md12 sm12 xs12">
                    <p class="va-text-secondary">{{ t('item.targetList') }} <VaChip size="small" outline color="textPrimary"> {{
                        targetList }}
                        </VaChip>
                    </p>
                </div>
            </div>
        </VaCardContent>
        <VaDivider v-if="showDetails" style="margin: 0;" />
        <VaCardContent v-if="showDetails">
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaStepper vertical controls-hidden :steps="statuses">
                        <template v-for="step, i in statuses" :key="step.label" #[`step-button-${i}`]>
                            <VaButton
                                :icon="statusIndex !== -1 && statusIndex < i ? 'far-circle' : 'far-circle-check'"
                                preset="secondary"
                                :color="currentStatus === step.value ? 'success' : 'textPrimary'">
                                {{ t(step.label) }}
                            </VaButton>
                            <p class="va-text-secondary"> {{ t(step.description) }}</p>
                        </template>
                    </VaStepper>
                </div>
            </div>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';


const {t} = useI18n()
const props = defineProps<{
    statuses: {
        label: string,
        description: string,
        value: string,
    }[],
    title: string,
    currentStatus: string,
    targetList?: string
}>()

const showDetails = ref(false)

const statusIndex = computed(() => props.statuses.findIndex(({ value }) => value === props.currentStatus))


</script>
