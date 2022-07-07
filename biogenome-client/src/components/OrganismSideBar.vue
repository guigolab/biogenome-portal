<template>
    <va-card class="custom-card">
        <va-card-title v-if="bioprojects.length">Bioprojects</va-card-title>
        <va-card-content v-if="bioprojects.length">
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12" style="height:300px;overflow:scroll">
                    <ul>
                        <li v-for="(item, index) in bioprojects"
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
        <va-card-title>Lineage</va-card-title>
        <va-card-content>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12" style="max-height:300px;overflow:scroll">
                    <ul>
                        <li v-for="(item, index) in lineage"
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
</template>
<script setup>

const props = defineProps({
    lineage:Array,
    bioprojects:Array
})

</script>