<template>
    
</template>
<script setup>
import { onMounted } from '@vue/runtime-core';
import DataPortalService from '../services/DataPortalService';

const props = defineProps({
    model:String
})

onMounted(()=>{
    switch(props.model){
        case 'assemblies':
        break;
        case 'experiments':
        break;
        case 'biosamples':
        break;
        case 'local_samples':
        break;
        case 'annotations':
        break;
        case 'organisms':
        break;

    }
})
</script>