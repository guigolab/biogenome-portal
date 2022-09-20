<template>
    <div class="row">
        <div class="flex">
            <TransitionGroup name="list" tag="div" style="display:flex">
                <va-card v-for="dt in stats" :key="dt" class="custom-card box" :stripe="query[dt]" :stripe-color="dataIcons[dt].color" @click="$emit('onDataSelection',dt)">
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
                                <va-progress-circle size="large" :thickness="0.15" :color="dataIcons[dt].color" class="mb-2" :modelValue="((statistics[dt]/total)*100).toFixed(2)">
                                    {{ ((statistics[dt]/total)*100).toFixed(2) + '%' }}
                                </va-progress-circle>
                            </div>
                            <div class="flex">
                                <p><strong>{{statistics[dt]}}</strong></p><va-divider/><p class="text--secondary">{{total}}</p>
                            </div>
                        </div>
                    </va-card-content>
                </va-card> 
            </TransitionGroup>
        </div>
    </div>
</template>

<script setup>
import { computed, defineEmits, defineProps} from 'vue'
import {dataIcons} from '../../config'

const emits = defineEmits(['onDataSelection'])
const props = defineProps({
    statistics : Object,
    total:Number,
    query: Object
})
const stats = computed(()=> Object.keys(props.statistics))


</script>
<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>