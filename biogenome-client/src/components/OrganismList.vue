<template>
<va-card class="custom-card">
    <va-card-title>
        organisms
    </va-card-title>
    <va-card-content>
        <div class="row justify--space-between">
            <div class="flex">
                <va-button-dropdown color="gray" leftIcon flat outline :label="orgStore.query.limit">
                    <va-button
                        color="gray"
                        flat
                        :disabled="orgStore.query.limit === opt"
                        v-for="(opt,index) in [20,50,100]"
                        :key="index"
                        @click="orgStore.query.limit=opt"
                    >
                    {{opt}}
                    </va-button>
                </va-button-dropdown>
            </div>
            <div class="flex">
                <va-button-dropdown color="gray" leftIcon flat outline :label="(orgStore.query.offset+1)+'-'+(orgStore.query.limit+orgStore.query.offset>orgStore.total?orgStore.total:orgStore.query.limit+orgStore.query.offset)+' of '+orgStore.total">
                    <va-button :disabled="orgStore.query.offset === 0" @click="orgStore.query.offset=0" flat color="gray">Start</va-button>
                    <va-button :disabled="orgStore.query.offset+orgStore.query.limit >= orgStore.total" @click="orgStore.query.offset=orgStore.total-orgStore.query.limit" flat color="gray">End</va-button>
                </va-button-dropdown>
                <va-button color="gray" v-if="orgStore.query.offset-orgStore.query.limit > 0" @click="orgStore.query.offset=orgStore.query.offset-orgStore.query.limit" flat icon="chevron_left"/>
                <va-button color="gray" v-if="orgStore.query.offset+orgStore.query.limit < orgStore.total" @click="orgStore.query.offset=orgStore.query.offset+orgStore.query.limit" flat icon="chevron_right"/>
            </div> 
        </div>
        <va-divider/>
        <div class="row">
            <div class="flex lg12 md12">
                <ul style="max-height:65vh;overflow:scroll" >
                    <li  v-for="(item, index) in orgStore.organisms"
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
                                        <a class="link">{{item.scientific_name}}</a>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="flex text--secondary" style="padding-left:10px">
                                        <p style="text-align: start" v-if="item.insdc_common_name"><i>{{item.insdc_common_name}}</i></p>
                                        <p style="text-align:start">{{item.taxid}}</p>  
                                        <p style="text-align:start">{{item.tolid_prefix}}</p>
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
import { computed, onMounted, watch } from "@vue/runtime-core";
import dataIcons from '../../config'
import {organisms} from '../stores/organisms'
import {taxons} from '../stores/taxons'
import DataPortalService from '../services/DataPortalService'

const orgStore = organisms()
const taxStore = taxons()

onMounted(()=>{
    orgStore.loadOrganisms()
})

function mapData(item){
    return Object.keys(item).filter(k => ['local_samples','biosamples','assemblies','experiments','annotations'].includes(k))
    .filter(key => item[key].length)
}
watch(orgStore.query, ()=>{
    orgStore.loadOrganisms()
})

</script>
<style scoped>
li.organism-item{
    padding: 5px;
}
</style>