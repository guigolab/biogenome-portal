<template>
<va-card class="custom-card">
    <va-card-title>
        organisms
    </va-card-title>
    <va-card-content>
        <div class="row justify--end">
            <div class="flex">
                <va-button color="gray" flat size="small" icon="chevron_left"/>
                <va-chip color="gray" flat class="title"> {{total}}</va-chip>
                <va-button color="gray" flat size="small" icon="chevron_right"/>
            </div> 
        </div>
        <va-divider/>
        <div class="row">
            <div class="flex lg12 md12">
                <ul>
                    <li  v-for="(item, index) in items"
                        :key="index"
                        class="organism-item">
                        <div class="row justify--space-between align--center">
                            <div class="flex">
                                <div class="row" style="margin-bottom:5px">
                                    <div v-if="item.image_url" class="flex">
                                        <va-avatar>
                                            <img :src="item.image_url">
                                        </va-avatar>
                                    </div>
                                    <div class="flex">
                                        <a style="font-size:1.2rem" class="link">{{item.scientific_name}}</a>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="flex">
                                        <blockquote class="va-blockquote">
                                            <p v-if="item.insdc_common_name"><i>{{item.insdc_common_name}}</i></p>
                                            <p style="text-align:start">{{item.taxid}}</p>  
                                            <p style="text-align:start">{{item.tolid_prefix}}</p>
                                        </blockquote>
                                    </div>
                                </div>
                            </div>
                            <div class="flex">
                                <div class="row justify--space-between">
                                    <div style="margin:0 10px 0 10px" v-for="dt in mapData(item)" :key="dt" class="flex">
                                        <va-icon
                                            :name="dataIcons[dt].icon"
                                            :color="dataIcons[dt].color"
                                            @click="console.log(dt)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <va-divider/>
                    </li>
                </ul>    
            </div>
        </div>
    </va-card-content>
</va-card>

</template>
<script setup>
import { reactive,ref } from "@vue/reactivity";
import { computed, onMounted } from "@vue/runtime-core";
import dataIcons from '../../config'
import DataPortalService from '../services/DataPortalService'
var items = ref([])
const columns = []
const total = ref(0)
const params = reactive({
    offset:0,
    limit:20,    
})

onMounted(()=>{
    DataPortalService.getOrganisms(params).
    then(response => {
        items.value = response.data.data
        total.value = response.data.total
    })
})

function mapData(item){
    return Object.keys(item).filter(k => ['local_samples','biosamples','assemblies','experiments','annotations'].includes(k))
    .filter(key => item[key].length)
}

</script>
<style scoped>
li.organism-item{
    padding: 15px;
}
</style>