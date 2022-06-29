<template>
    <div style="padding:15px" class="flex">
        <h1 style="text-align:start;" class="display-3">{{organism.scientific_name}}</h1>
        <div class="row justify--space-between">
            <div v-if="organism.insdc_common_name" class="flex">
                <p class="text--secondary">{{organism.insdc_common_name}}</p>
            </div>
            <div class="flex">
                <p class="text--secondary">{{organism.tolid_prefix}}</p>
            </div>
        </div>
    </div>
</template>
<script setup>

const props = defineProps({
    title:String,
    
})
</script>