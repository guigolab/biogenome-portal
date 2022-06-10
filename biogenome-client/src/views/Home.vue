<template>
<div class="row">
    <div class="flex lg3 md3"/>
    <div class="flex lg6 md6">
        <DataCards/>
    </div>
</div>
<div class="row">
    <div class="flex lg3 md3"/>
    <div class="flex lg6 md6">
    </div>
</div>
<div class="row">
    <div class="flex lg3 md3">
        <TreeSideBar/>
    </div>
    <div class="flex lg6 md6">
        <OrganismList/>
    </div>
</div>
</template>
<script setup>
import dataIcons from '../../config'
import OrganismList from '../components/OrganismList.vue'
import OrganismTable from '../components/OrganismTable.vue'
import TreeSideBar from '../components/TreeSideBar.vue'
import DataCards from '../components/DataCards.vue'
</script>