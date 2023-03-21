<template>
    <div ref="swagger" class="swagger" id="swagger">

    </div>
</template>
<script setup lang="ts">
import SwaggerUI from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';
import { onMounted, ref } from 'vue';

const swagger = ref()

onMounted(()=>{
    swagger.value.focus()
    console.log(swagger.value)
    const swaggerId = document.getElementById('#swagger')
    SwaggerUI({
        url: '../../biogenome-portal-schema.yaml',
        dom_id: swaggerId
})
})
</script>

<style scoped>
@import 'swagger-ui/dist/swagger-ui.css';
</style>