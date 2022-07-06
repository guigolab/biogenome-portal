<template>
    <va-modal
        v-model="showModal"
        hide-default-actions
        overlay-opacity="0.2"
    >
        <template #header>
        <h2>Are you sure??</h2>
        </template>
        <div>{{ }}</div>
        <template #footer>
        <va-button>
            Custom action
        </va-button>
        </template>
    </va-modal>
</template>

<script setup>

const props = defineProps({
    title:String,
    message:String,
    actions:Array
})

</script>