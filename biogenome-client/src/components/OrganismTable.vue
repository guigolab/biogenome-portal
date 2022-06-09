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
        <div class="row">
            <div class="flex">
                <va-data-table :items="items" :columns="columns">
                    <template #cell(data)="{ rowData }">
                        <div style="margin:0 10px 0 10px" v-for="dt in mapData(rowData)" :key="dt" class="flex">
                            <va-icon
                                :name="dataIcons[dt].icon"
                                :color="dataIcons[dt].color"
                                @click="console.log(dt)"
                            />
                        </div>
                    </template>
                </va-data-table>
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
const total = ref(0)
const params = reactive({
    offset:0,
    limit:20,    
})
const columns = [
      { key: 'taxid' },
      { key: 'scientific_name' },
      { key: 'insdc_common_name' },
      { key: 'tolid_prefix' },
      { key: 'data' },
    ]
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