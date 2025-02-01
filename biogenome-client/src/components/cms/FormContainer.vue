<template>
    <VaCollapse :header="title" stateful>
        <slot>

        </slot>
    </VaCollapse>
</template>
<script setup lang="ts">

const props = defineProps<{
    title: string
}>()
</script>