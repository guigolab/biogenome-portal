<template>
    <va-list>
        <va-list-item v-for="(name, index) in names" :key="index" class="list__item">
            <va-list-item-section>
                <va-list-item-label>
                    {{ name.value }}
                </va-list-item-label>
            </va-list-item-section>
            <va-list-item-section>
                <va-list-item-label>
                    <va-chip flat icon="language">{{ name.lang }}</va-chip>
                </va-list-item-label>
            </va-list-item-section>
            <va-list-item-section>
                <va-list-item-label>
                    <va-chip flat icon="location_on">{{ name.locality }}</va-chip>
                </va-list-item-label>
            </va-list-item-section>
        </va-list-item>
    </va-list>
</template>
<script setup lang="ts">

const props = defineProps<{
    names: Record<string, string>[]
}>()


</script>