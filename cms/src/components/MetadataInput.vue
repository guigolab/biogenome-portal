<template>
    <div v-for="(mt, index) in organismStore.metadataList" :key="index" class="row align-center">
        <div class="flex">
            <va-input :error="organismStore.metadataList.filter((m) => m.key === mt.key).length > 1 " v-model="mt.key"
                placeholder="attribute name" />
        </div>
        <div class="flex">
            <va-input v-model="mt.value" placeholder="attribute value" type="textarea" />
        </div>
        <div class="flex">
            <va-button icon="delete" color="danger" @click="organismStore.metadataList.splice(index, 1)">
                Delete Attribute
            </va-button>
        </div>
    </div>
    <div class="row">
        <div class="flex">
            <va-button icon="add" @click="organismStore.metadataList.push({ key: '', value: '' })">Add new
                attribute</va-button>
        </div>
    </div>

</template>
<script setup lang="ts">
import { useOrganismStore } from '../stores/organism-store';

const organismStore = useOrganismStore()


</script>