<template>
    <div class="row">
        <div v-for="dt in stats" :key="dt" class="flex">
            <va-card class="custom-card box" :stripe="orgStore.query[dt]" :stripe-color="dataIcons[dt].color" @click="dataSelected(dt, orgStore.stats[dt])">
                <va-card-content>
                    <div class="row align--center justify--space-between">
                        <div class="flex lg6 md6 sm6 xs6">
                            <div class="row align--center">
                                <div class="flex">
                                    <va-icon 
                                        :name="dataIcons[dt].icon"
                                        :color="dataIcons[dt].color"
                                    />
                                </div>
                                <div class="flex">
                                    <p>{{dt}}</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex lg4 md4 sm4 xs4">
                            <va-progress-bar
                                :model-value="((orgStore.stats[dt]/orgStore.total)*100).toFixed(2)"
                                :color="dataIcons[dt].color"
                            />
                        </div>
                        <div class="flex lg2 md2 sm2 xs2">
                            <p :style="{color:dataIcons[dt].color}">{{((orgStore.stats[dt]/orgStore.total)*100).toFixed(2)}}%</p>
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