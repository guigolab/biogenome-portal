<template>
    <div class="row">
        <div v-for="dt in stats" :key="dt" class="flex lg3 md3 sm6 xs6">
            <va-card class="custom-card" :stripe="orgStore.query[dt]" :stripe-color="dataIcons[dt].color" @click="dataSelected(dt, orgStore.stats[dt])">
                <va-card-title>
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            <p>{{dt}}</p>
                        </div>
                        <div class="flex">
                            <va-icon 
                                :name="dataIcons[dt].icon"
                                :color="dataIcons[dt].color"
                            >
                            </va-icon>
                        </div>
                    </div>
                </va-card-title>
                <va-card-content>
                    <div class="row justify--space-between">
                        <div class="flex">
                            <va-progress-circle size="large" :thickness="0.15" :color="dataIcons[dt].color" class="mb-2" :modelValue="((orgStore.stats[dt]/orgStore.total)*100).toFixed(2)">
                                {{ ((orgStore.stats[dt]/orgStore.total)*100).toFixed(2) + '%' }}
                            </va-progress-circle>
                        </div>
                        <div class="flex">
                            <p><strong>{{orgStore.stats[dt]}}</strong></p><va-divider/><p class="text--secondary">{{orgStore.total}}</p>
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
    orgStore.query[dataKey] = orgStore.query[dataKey] ? null : true
}

</script>