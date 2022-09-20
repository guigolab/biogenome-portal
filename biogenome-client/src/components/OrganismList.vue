<template>
<va-card class="custom-card">
    <va-card-title>
        <div class="row justify--space-between">
            <div class="flex">
                organisms
            </div>
        </div>
    </va-card-title>
    <va-card-content>
        <Pagination :query="query" :total="total" @update="bubbleUp"/>
        <!-- <div class="row justify--end align--center">
            <div class="flex">
                <va-button-dropdown color="primary" leftIcon flat outline :label="(query.offset+1)+'-'+(limit+query.offset>total?total:limit+query.offset)+' of '+total">
                    <va-button :disabled="query.offset === 0" @click="$emit('update',0)" flat color="primary">Start</va-button>
                    <va-button :disabled="query.offset+limit >= total" @click="$emit('update',total-limit)" flat color="primary">End</va-button>
                </va-button-dropdown>
                <va-button color="primary" :disabled="query.offset-limit < 0" @click="$emit('update',query.offset-limit)" flat icon="chevron_left"/>
                <va-button color="primary" :disabled="query.offset+limit >= total" @click="$emit('update',query.offset+limit)" flat icon="chevron_right"/>
            </div>
        </div> -->
    </va-card-content>
    <va-card-content style="max-height:50vh;overflow:scroll">
        <va-list style="padding-top:0!important">
            <va-list-item
                v-for="(organism, index) in props.organisms"
                :key="index"
                :to="{name:'organism-details',params:{taxid:organism.taxid}}"
            >
                <va-list-item-section avatar>
                    <va-avatar size="large">
                        <img :src="organism.image">
                    </va-avatar>
                </va-list-item-section>
                <va-list-item-section style="text-align:start">
                    <va-list-item-label>
                    {{ organism.scientific_name}}
                    </va-list-item-label>
                    <va-list-item-label caption>
                    {{ organism.insdc_common_name ? organism.insdc_common_name+', '+organism.tolid_prefix:organism.tolid_prefix }}
                    </va-list-item-label>
                </va-list-item-section>
                <va-list-item-section icon>
                    <va-icon style="padding:5px" v-for="dt in mapData(organism)" :key="dt"
                        :name="dataIcons[dt].icon"
                        :color="dataIcons[dt].color"
                    />
                </va-list-item-section>
            </va-list-item>
        </va-list>
    </va-card-content>
</va-card>
</template>
<script setup>
import { ref, defineEmits } from 'vue'
import {dataIcons} from '../../config'
import portalService from '../services/DataPortalService'
import {useRouter} from 'vue-router'
import Pagination from './Pagination.vue';
import { emit } from 'process';

const emits = defineEmits(['update'])

const props = defineProps({
    organisms: Array,
    query: Object,
    isLoading:Boolean,
    total:String
})

const router = useRouter()

const limit = ref(props.query.limit)

function mapData(item){
    return Object.keys(item).filter(k => ['local_samples','biosamples','assemblies','experiments','annotations'].includes(k))
    .filter(key => item[key].length)
}

function bubbleUp(value){
    emits("update",value)
}

</script>
<style scoped>

.organism-item{
    margin: 10px;

}

</style>