<template>
    <h2 class="va-h2" style="margin: 0;"> {{ name }}</h2>
</template>
<script setup lang="ts">

const props = defineProps<{
    name: string
}>()
</script>