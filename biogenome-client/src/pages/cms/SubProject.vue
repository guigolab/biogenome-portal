<template>
    <Header :title="name" />
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <!--  -->
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <!--  -->
        </div>
        <div class="flex lg6 md6 sm12 xs12">
            <!--  -->
        </div>
    </div>

</template>
<script setup lang="ts">
import Header from '../../components/cms/Header.vue';
const props = defineProps<{
    name: string,
}>()



</script>