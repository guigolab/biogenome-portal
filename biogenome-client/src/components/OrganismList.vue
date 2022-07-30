<template>
<div>
    <div class="row justify--space-between align--center">
        <div v-if="isHome" class="flex">
            <OrganismFilter/>
        </div>
        <div class="flex">
            <va-button-dropdown color="primary" leftIcon flat outline :label="(query.offset+1)+'-'+(limit+query.offset>total?total:limit+query.offset)+' of '+total">
                <va-button :disabled="query.offset === 0" @click="query.offset=0" flat color="primary">Start</va-button>
                <va-button :disabled="query.offset+limit >= total" @click="query.offset=total-limit" flat color="primary">End</va-button>
            </va-button-dropdown>
            <va-button color="primary" :disabled="query.offset-limit < 0" @click="query.offset=query.offset-limit" flat icon="chevron_left"/>
            <va-button color="primary" :disabled="query.offset+limit >= total" @click="query.offset=query.offset+limit" flat icon="chevron_right"/>
        </div>
    </div>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12" style="height:50vh;overflow:scroll" v-if="props.organisms.length">
            <va-inner-loading :loading="isLoading">
                <va-card 
                    v-for="(item, index) in props.organisms"
                    :key="index"
                    class="organism-item"
                    @click="$router.push({name:'organism-details',params:{taxid:item.taxid}})"
                >
                    <va-card-content>
                        <div class="row align--center justify--space-between" style="margin-bottom:5px">
                            <div class="flex">
                                <div class="row">
                                    <div class="flex">
                                        <va-avatar size="large">
                                            <img :src="item.image">
                                        </va-avatar>
                                    </div>
                                    <div class="flex" style="text-align:start;padding-left: 5px;">
                                        <h5 class="display-6" style="text-align:start">{{item.scientific_name}}</h5>
                                        <div class="row align--center justify-content--space-between">
                                            <div class="flex text--secondary" style="padding:0 0 0 15px">
                                                <p style="text-align:start" v-if="item.insdc_common_name">{{item.insdc_common_name}}</p>
                                                <p style="text-align:start">{{item.tolid_prefix}}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="flex">
                                <div class="row">
                                    <div style="margin:0 10px 0 10px" v-for="dt in mapData(item)" :key="dt" class="flex">
                                        <va-popover :message="'total '+ dt +': '+item[dt].length">
                                            <va-icon
                                                :name="dataIcons[dt].icon"
                                                :color="dataIcons[dt].color"
                                            />
                                        </va-popover>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </va-card-content>
                </va-card>
            </va-inner-loading>
        </div>
        <div v-else class="flex text--secondary">
            <p class="custom-card">No organisms found</p>
        </div>
    </div>
    <va-modal v-model="showModal">
        <template #header>
            <va-badge :color="dataIcons[popupData.model].color" :text="popupData.data.length"><h2>{{popupData.title}}</h2></va-badge>
        </template>
        <DataTable :items="popupData.data" :columns="dataIcons[popupData.model].fields" :color="dataIcons[popupData.model].color"/>
    </va-modal>
</div>
</template>
<script setup>
import { watch,nextTick,ref, reactive, computed } from 'vue'
import {dataIcons} from '../../config'
import portalService from '../services/DataPortalService'
import DataTable from '../components/data/DataTable.vue'
import OrganismFilter from './OrganismFilter.vue'
import {useRouter} from 'vue-router'

const props = defineProps({
    organisms: Array,
    query: Object,
    isLoading:Boolean,
    total:String
})

const router = useRouter()

const toggledMetadata = reactive({
    name:'',
    metadata:{}
})
const showMetadata = ref(false)
const showModal = ref(false)
const limit = ref(props.query.limit)
const popupData = reactive({
    title:'',
    model:'',
    data:''
})

const isHome = computed(()=>{
    return router.currentRoute.value.name === 'home'
})

function mapData(item){
    return Object.keys(item).filter(k => ['local_samples','biosamples','assemblies','experiments','annotations'].includes(k))
    .filter(key => item[key].length)
}


</script>
<style scoped>

.organism-item{
    margin: 10px;
    transition: box-shadow .5s;
    border: 1px solid #eff3f8;
}
.organism-item:hover{
    box-shadow: 0 0 15px rgba(33,33,33,.2);
    border: 1px solid rgba(33,33,33,.2);
}
</style>