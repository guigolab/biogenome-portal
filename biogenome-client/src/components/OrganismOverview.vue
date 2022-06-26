<template>
    <div class="row">
        <div class="flex">
            <div v-if="organism.goat_status" class="row justify--space-between align--center">
                <div style="padding:15px" class="flex">
                    <h6 style="text-align:start" class="display-6">GoaT status</h6>
                    <div style="padding:15px" class="row">
                        <div class="flex">
                            <va-badge v-for="(status,index) in GoaTStatus" :key="index" dot overlap :color="GoaTStatus.findIndex(stat => stat.label === organism.goat_status) >= index ? 'success':'warning'">
                                <va-chip :icon="status.icon" size="small" flat>{{status.label}}</va-chip>
                            </va-badge>
                        </div>
                    </div>
                    <va-divider/>
                    <h6 style="text-align:start" class="display-6">INDSC status</h6>
                    <div style="padding:15px" class="row">
                        <div class="flex">
                            <va-badge v-for="(status,index) in INSDCStatus" :key="index" dot overlap :color="INSDCStatus.findIndex(stat => stat.label === organism.insdc_status) >= index ? 'success':'warning'">
                                <va-chip :icon="status.icon" size="small" flat>{{status.label}}</va-chip>
                            </va-badge>
                        </div>
                    </div>
                    <va-divider/>
                </div>
            </div>
        
            <div class="row">
                <div class="flex">
                    <h6 class="display-6">Lineage</h6>
                </div>
                <div class="flex">
                    <va-card>
                        <va-card-content>
                            <va-data-table
                                :items="organism.taxon_lineage"
                                :hoverable="true"
                                sticky-header
                                height="500px"
                            >
                            </va-data-table>
                        </va-card-content>
                    </va-card>
                </div>
            </div>
            <div class="row">
                <div class="flex">
                    <h6 class="display-6">Bioprojects</h6>
                </div>
                <div class="flex">
                    <va-card>
                        <va-card-content>
                            <va-data-table
                                :items="organism.bioprojects"
                                :hoverable="true"
                                sticky-header
                                height="500px"
                            >
                            </va-data-table>
                        </va-card-content>
                    </va-card>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import {GoaTStatus,INSDCStatus} from '../../config'


const props = defineProps({
    organism:Object
})
</script>