<template>
    <va-card class="custom-card">
        <va-card-title>taxonomy browser</va-card-title>
        <va-card-content></va-card-content>
        <va-card-content style="max-height:65vh;overflow:scroll">
            <TreeBrowser :children="taxStore.tree"/>
        </va-card-content>
    </va-card>
</template>
<script setup>
import { onMounted,ref } from '@vue/runtime-core'
import TreeBrowser from './TreeBrowser.vue'
import DataPortalService from '../services/DataPortalService'
import {organisms} from '../stores/organisms'
import {taxons} from '../stores/taxons'

const orgStore = organisms()
const taxStore = taxons()

const ROOTNODE = '2759'

onMounted(()=>{
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
        taxStore.tree = resp.data
    })
})
</script>