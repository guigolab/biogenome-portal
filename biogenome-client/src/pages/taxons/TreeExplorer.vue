<template>
    <va-inner-loading :loading="isLoading">

    </va-inner-loading>
</template>
<script setup lang="ts">
import {reactive, ref} from 'vue'
import IndentedTree from '../../components/tree/IndentedTree.vue'

const isLoading = ref(true)

const treeData = reactive()


</script>