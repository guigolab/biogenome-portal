<template>
    <h2 class="va-h2"> {{ name }}</h2>
</template>
<script setup lang="ts">

const props = defineProps<{
    name: string
}>()
</script>