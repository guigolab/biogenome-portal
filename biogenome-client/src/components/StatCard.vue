<template>
    <VaCard :to="{ name: field }" class="hover-shadow">
        <VaCardContent>
            <div class="row justify-space-between align-center">
                <div class="flex">
                    <Counter :duration="2000" :target-value="count" />
                    <p> {{ t(`sidebar.${field}`) }}
                    </p>
                </div>
                <div class="flex">
                    <VaIcon :color="color" :name="icon" size="large"></VaIcon>
                </div>
            </div>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import Counter from './Counter.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
    icon: string,
    field: string,
    color: string,
    count: number
}>()

const { t } = useI18n()


</script>
<style scoped>
.hover-shadow:hover {
    box-shadow: rgba(0, 0, 0, 0.12) 0px 6px 10px 10px;
}
</style>