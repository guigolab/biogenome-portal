<template>
    <div class="row">
        <div style="padding:15px" class="flex">
            <div v-if="organism.goat_status" class="row align--center justify--space-between">
                <div class="flex">
                    <p class="title">goat status:</p>
                </div>
                <div class="flex">
                    <va-badge v-for="(status,index) in GoaTStatus" :key="index" dot overlap :color="GoaTStatus.findIndex(stat => stat.label === organism.goat_status) >= index ? 'success':'warning'">
                        <va-popover :message="status.label">
                            <div class="status-icon-wrapper">
                                <va-icon :name="status.icon" />
                            </div>
                        </va-popover>
                    </va-badge>
                </div>
            </div>
            <va-divider/>
            <div v-if="organism.insdc_status" class="row align--center justify--space-between">
                <div class="flex">
                    <p class="title">insdc status:</p>
                </div>
                <div class="flex">
                    <va-badge v-for="(status,index) in INSDCStatus" :key="index" dot overlap :color="INSDCStatus.findIndex(stat => stat.label === organism.insdc_status) >= index ? 'success':'warning'">
                        <va-popover :message="status.label">
                            <div class="status-icon-wrapper">
                                <va-icon :name="status.icon"/>
                            </div>
                        </va-popover>
                    </va-badge>
                </div>
            </div>
            <va-divider/>
            <div class="row">
                <div class="flex">
                    <va-card>
                        <va-card-title>
                            Lineage
                        </va-card-title>
                        <va-card-content>
                            <div class="row">
                                <div class="flex" style="height:200px;overflow:scroll">
                                    <ul>
                                        <li v-for="(item, index) in organism.taxon_lineage"
                                            :key="index"
                                            class="taxon-item">
                                            <div class="row justify--space-between align--center">
                                                <div class="flex">
                                                    <div class="row" style="margin-bottom:5px">
                                                        <div class="flex">
                                                            <a class="link">{{item.name}}</a>
                                                        </div>
                                                    </div>
                                                    <div class="row">
                                                        <div class="flex text--secondary" style="padding-left:10px">
                                                            <p style="text-align:start">{{'taxID: '+item.taxid}}</p>
                                                            <p style="text-align:start">{{'rank: '+item.rank}}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="flex">
                                                    <div class="row justify--space-between">
                                                        <div style="margin:0 10px 0 10px" class="flex">
                                                            <va-icon name="call_split"/>
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
                </div>
            </div>
            <div class="row">
                <div class="flex">
                    <va-card>
                        <va-card-title>
                            Bioprojects
                        </va-card-title>
                        <va-card-content>
                            <div class="row">
                                <div class="flex lg12 md12 sm12 xs12" style="height:200px;overflow:scroll">
                                    <ul>
                                        <li v-for="(item, index) in organism.bioprojects"
                                            :key="index"
                                            class="taxon-item">
                                            <div class="row justify--space-between align--center">
                                                <div class="flex">
                                                    <div class="row" style="margin-bottom:5px">
                                                        <div class="flex">
                                                            <a class="link">{{item.accession}}</a>
                                                        </div>
                                                    </div>
                                                    <div class="row">
                                                        <div class="flex text--secondary" style="padding-left:10px">
                                                            <p style="text-align:start">{{item.title}}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="flex">
                                                    <div class="row justify--space-between">
                                                        <div style="margin:0 10px 0 10px" class="flex">
                                                            <va-icon name="travel_explore"/>
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