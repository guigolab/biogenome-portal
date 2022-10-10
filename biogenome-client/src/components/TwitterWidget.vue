<template>
    <div style="max-height:250px;overflow: scroll;">
        <a class="twitter-timeline" :href="twitter">Tweets are loading</a>
    </div>
</template>
<script setup>
import { onMounted } from "@vue/runtime-core";
import TwitterWidgetsLoader from 'twitter-widgets'
import { onBeforeRouteUpdate } from "vue-router";

const props = defineProps({
    twitter:String
})

onMounted(()=>{
    TwitterWidgetsLoader.load()
})

</script>