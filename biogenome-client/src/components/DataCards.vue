<template>
    <div class="row">
        <div v-for="dt in stats" :key="dt" class="flex">
            <va-card :stripe="orgStore.query[dt]" :stripe-color="dataIcons[dt].color" @click="dataSelected(dt)">
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
                            <p><strong>{{orgStore.stats[dt]}}</strong></p>
                        </div>
                    </div>
                </va-card-content>
            </va-card> 
        </div>
    </div>
</template>

<script setup>
import gsap from 'gsap'
import { computed, onMounted, ref, watch } from '@vue/runtime-core'
import {dataIcons} from '../../config'
import DataPortalService from '../services/DataPortalService'
import {organisms} from '../stores/organisms'

const orgStore = organisms()

const stats = computed(()=> Object.keys(orgStore.stats).filter(key => orgStore.stats[key]>0))

watch(orgStore.stats, (stats) => {
    console.log('HELLOOO')
//   gsap.to(tweened, { duration: 0.5, number: Number(n) || 0 })
},{deep:true})


const emit = defineEmits(['onDataSelection'])

function dataSelected(dataKey){
    emit('onDataSelection',dataKey)
}

var data = ref({})

onMounted(()=>{

})

</script>