<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <va-card class="custom-card">
                <va-card-title>
                    Related data
                </va-card-title>
                <va-card-content v-for="dt in stats" :key="dt">
                    <div class="row align--center justify--space-between">
                        <div class="flex lg5 md6 sm6 xs6">
                            <div class="row align--center">
                                <div class="flex">
                                    <va-chip @click="dataSelected(dt, orgStore.stats[dt])" :outline="!orgStore.query[dt]" :color="dataIcons[dt].color" :icon="dataIcons[dt].icon">{{dt}}</va-chip>
                                </div>
                            </div>
                        </div>
                        <div class="flex lg5 md6 sm6 xs6">
                            <div class="row justify--space-between">
                                <div class="flex lg8 md8 sm8 xs8">
                                    <va-progress-bar
                                        :model-value="((orgStore.stats[dt]/orgStore.total)*100).toFixed(0)"
                                        :color="dataIcons[dt].color"
                                    />
                                </div>
                                <div class="flex">
                                    <span class="left-space" :style="{color:dataIcons[dt].color}">{{((orgStore.stats[dt]/orgStore.total)*100).toFixed(2)}}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </va-card-content>
            </va-card>
        </div>
    </div>
</template>

<script setup>
import { computed} from '@vue/runtime-core'
import {dataIcons} from '../../config'
import {organisms} from '../stores/organisms'

const orgStore = organisms()

const stats = computed(()=> Object.keys(orgStore.stats))

function dataSelected(dataKey, count){
    if(orgStore.query.offset >= count){
        orgStore.query.offset = 0
    }
    orgStore.query[dataKey] = orgStore.query[dataKey] ? null : true
}

</script>
<style scoped>
.left-space{
    padding-left:5px;
}
</style>