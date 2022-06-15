<template>
    <div class="row">
        <div v-for="dt in stats" :key="dt" class="flex">
            <va-card class="custom-card" :stripe="orgStore.query[dt]" :stripe-color="dataIcons[dt].color" @click="dataSelected(dt)">
                <va-card-title>
                    <div class="row justify--space-between align--center">
                        <div class="flex">
                            {{dt}}
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
                    <div class="row justify--start">
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

function dataSelected(dataKey){
    orgStore.query[dataKey] = orgStore.query[dataKey] ? null : true
}

</script>