<template>
    <div class="row row-equal">
        <div class="flex lg12 md12 sm12 xs12">
            <div id="ideo-container"></div>
        </div>
    </div>
</template>
<script setup lang="ts">
import Ideogram from 'ideogram'
import { onMounted } from 'vue'

const props = defineProps<{
    taxid: string,
    accession: string
}>()



onMounted(() => {
    new Ideogram({
        organism: props.taxid,
        assembly: props.accession,
        container: '#ideo-container'
    })
})
</script>
<style scoped>
#ideo-container {
    height: 300px;
    width: 50%;
    margin: auto;
}
</style>