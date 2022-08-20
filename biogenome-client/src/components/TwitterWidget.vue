<template>
    <div style="max-height:50vh;overflow: scroll;">
        <a class="twitter-timeline" :href="twitter">Tweets by CatBiogenoma</a>
    </div>
</template>
<script setup>
import { onMounted } from "@vue/runtime-core";
import TwitterWidgetsLoader from 'twitter-widgets'

const props = defineProps({
    twitter:String
})

onMounted(()=>{
    TwitterWidgetsLoader.load()
})
</script>