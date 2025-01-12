<template>
    <div class="row justify-center">
        <div class="flex lg12 md12 sm12 xs12">
            <h1 class="va-h1">{{ title }}</h1>
            <p v-if="description" class="va-text-secondary">{{ description }}</p>
        </div>
    </div>
</template>
<script setup lang="ts">


const props = defineProps<{
    title: string,
    description?: string
}>()

</script>