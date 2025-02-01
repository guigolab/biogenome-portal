<template>
    <VaCard>
        <VaCardContent>
            <h2 class="va-h6">
                Metadata
            </h2>
            <p class="va-text-secondary">
                Add custom metadata
            </p>
        </VaCardContent>
        <VaCardContent>
            <div v-for="(mt, index) in organismStore.metadataList" :key="index" class="row align-center">
                <div class="flex">
                    <VaInput :error="organismStore.metadataList.filter((m) => m.key === mt.key).length > 1"
                        v-model="mt.key" placeholder="Attribute name" />
                </div>
                <div class="flex">
                    <VaInput v-model="mt.value" placeholder="Attribute value" type="textarea" />
                </div>
                <div class="flex">
                    <VaButton preset="secondary" icon="fa-close" color="danger"
                        @click="organismStore.metadataList.splice(index, 1)">
                        Delete
                    </VaButton>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <VaButton icon="add" @click="organismStore.metadataList.push({ key: '', value: '' })">Add new
                        attribute</VaButton>
                </div>
            </div>
        </VaCardContent>
    </VaCard>
</template>
<script setup lang="ts">
import { useOrganismStore } from '../../stores/organism-store';

const organismStore = useOrganismStore()


</script>