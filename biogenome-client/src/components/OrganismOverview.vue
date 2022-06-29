<template>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <div v-if="organism.goat_status" class="row align--center justify--start">
                <div class="flex">
                    <p class="title">goat status:</p>
                </div>
                <div class="flex">
                    <div class="row">
                        <div v-for="(status,index) in GoaTStatus" :key="index" class="status-icon-wrapper flex">
                            <va-badge  dot overlap :color="GoaTStatus.findIndex(stat => stat.label === organism.goat_status) >= index ? 'success':'warning'">
                                <va-popover :message="status.label">
                                    <va-icon :name="status.icon" />
                                </va-popover>
                            </va-badge>
                        </div>
                    </div>
                </div>
            </div>
            <va-divider/>
            <div v-if="organism.insdc_status" class="row align--center justify--start">
                <div class="flex">
                    <p class="title">insdc status:</p>
                </div>
                <div class="flex">
                    <div class="row">
                        <div v-for="(status,index) in INSDCStatus" :key="index" class="status-icon-wrapper flex">
                            <va-badge  dot overlap :color="INSDCStatus.findIndex(stat => stat.label === organism.insdc_status) >= index ? 'success':'warning'">
                                <va-popover :message="status.label">
                                    <va-icon :name="status.icon"/>
                                </va-popover>
                            </va-badge>
                        </div>
                    </div>
                </div>
            </div>
            <va-divider/>
            <div class="row">
                <div class="flex">
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import {GoaTStatus,INSDCStatus} from '../../config'
import {ref} from 'vue'

const selectedStatus = ref('insdc_status')

const props = defineProps({
    organism:Object
})
</script>
<style scoped>
.status-icon-wrapper{
    padding:15px;
}
.status-icon-wrapper::before{
    top:15px;
    width: 10px;
}
.status-icon-wrapper::after{
    top:15px;
    width: 10px;
}
li.taxon-item{
    padding: 5px;
}
li.taxon-item:hover{
    padding: 5px;
}
</style>