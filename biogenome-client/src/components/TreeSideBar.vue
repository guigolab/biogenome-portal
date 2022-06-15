<template>
    <va-card>
        <va-card-title>taxonomy browser</va-card-title>
        <va-card-content></va-card-content>
        <va-card-content style="max-height:80vh;overflow:scroll">
            <TreeBrowser :item="taxStore.tree"/>
        </va-card-content>
    </va-card>
</template>
<script setup>
import { onMounted } from '@vue/runtime-core'
import TreeBrowser from './TreeBrowser.vue'
import DataPortalService from '../services/DataPortalService'
import {taxons} from '../stores/taxons'
import {ROOTNODE} from '../../config'
const taxStore = taxons()

onMounted(()=>{
    DataPortalService.getTaxonChildren(ROOTNODE)
    .then(resp => {
        taxStore.tree = resp.data
        taxStore.initializeTaxNav()
        
    })
})
</script>