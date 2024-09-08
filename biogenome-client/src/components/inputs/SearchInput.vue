<template>
    <VaInput iconColor="primary" v-model="filter" clearable :placeholder="t('buttons.search')">
        <template #appendInner>
            <va-icon name="search" />
        </template>
    </VaInput>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emits = defineEmits(['onSearchChange'])

const props = defineProps<{
    value: string
}>()
const filter = computed({
    get() {
        return props.value
    },
    set(value: string) {
        emits('onSearchChange', value)
    }
})


</script>