<template>
    <va-divider>Metadata</va-divider>
    <va-card-content>
        <div v-for="(mt, index) in organismStore.metadataList" :key="index" class="row align-center justify-between">
            <div class="flex lg8 md8 sm8 xs8">
                <va-input v-model="mt.key" label="attribute name" class="mt-3"
                    :rules="[(v: string) => organismStore.metadataList.filter((m) => m.key === v).length === 1 || `Attribute name ${v} is already present`]" />
                <va-input v-model="mt.value" label="attribute value" class="mt-3" type="textarea"
                    :rules="[(v: string) => v.length > 0 || 'Value is required']" />
            </div>
            <div class="flex">
                <va-button icon="delete" color="danger" @click="organismStore.metadataList.splice(index, 1)">
                    Delete Attribute
                </va-button>
            </div>
        </div>
        <va-button class="mt-3" icon="add" @click="organismStore.metadataList.push({ key: '', value: '' })">Add new
            attribute</va-button>
    </va-card-content>
</template>
<script setup lang="ts">
import { useOrganismStore } from '../../../../stores/organism-store';

const organismStore = useOrganismStore()


</script>