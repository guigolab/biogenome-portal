<template>
{{dataKeys}}
    <div v-if="organismLoaded" class="row">
        <div class="flex">
            <va-tabs
                v-model="tabValue"
            >
                <template #tabs>
                <va-tab
                    v-for="dataKey in dataKeys"
                    :name="dataKey"
                    :key="dataKey"
                    :icon="dataIcons[dataKey].icon"
                    :color="dataIcons[dataKey].color"
                >
                    {{ dataKey }}
                </va-tab>
                </template>
            </va-tabs>
        </div>
        <div class="flex">
            <va-card>
                <va-card-title>
                    {{organism.scientific_name}}
                </va-card-title>
                <va-card-content>
                    <va-data-table :items="organism[value]">
                    </va-data-table>
                </va-card-content>
            </va-card>
        </div>
    </div>
</template>
<script setup>
import { computed, nextTick, onMounted, reactive, ref } from '@vue/runtime-core'
import {dataIcons} from '../../config'
import DataPortalService from '../services/DataPortalService'

var tabValue = ref(null)

const props = defineProps({
    taxid:String
})
var organismLoaded = ref(false)

var organism = reactive({})

var dataKeys = reactive([])

onMounted(()=>{
    DataPortalService.getOrganism(props.taxid)
    .then(response => {
        nextTick(()=>{
            organism = {...response.data}
            organismLoaded.value = true
            dataKeys = [...Object.keys(dataIcons).filter(d => organism[d])]
            tabValue.value = dataKeys[0]
        })
    })
})
</script>