<template>
<div class="row">
    <div class="flex">
        <DataCards/>
    </div>
</div>
<div class="row">
    <div class="flex lg4">
        <OrganismList/>
    </div>
</div>
</template>
<script setup>
import dataIcons from '../../config'
import OrganismList from '../components/OrganismList.vue'
import OrganismTable from '../components/OrganismTable.vue'
import DataCards from '../components/DataCards.vue'
</script>