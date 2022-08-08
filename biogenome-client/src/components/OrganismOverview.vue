<template>
    <div>
        <div v-if="organism.metadata && Object.keys(organism.metadata).length" class="custom-card">
            <div class="row">
                <div class="flex">
                    <h3 style="text-align:start" class="display-3">
                        Metadata
                    </h3>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <va-card v-for="key in Object.keys(organism.metadata)" style="margin:10px" :key="key" class="child-container box">
                        <div class="row justify--space-between align--center">
                            <div class="flex lg12 md12 sm12 xs12" style="text-align:start;padding-left: 5px;">
                                <h5 class="display-6" style="text-align:start">{{key}}</h5>
                                <div class="row align--center justify-content--start">
                                    <div class="flex text--secondary" style="font-size: 16px;">
                                        <p style="text-align:start">{{organism.metadata[key]}}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </va-card>
                </div>
            </div>
        </div>
        <div v-if="organism.common_names && organism.common_names.length" class="custom-card">
            <div class="row">
                <div class="flex">
                    <h3 style="text-align:start" class="display-3">
                        Names
                    </h3>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <va-card v-for="(name,index) in organism.common_names" style="margin:10px" :key="index" class="child-container box">
                        <div class="row align--center justify--start">
                            <div class="flex lg12 md12 sm12 xs12" style="text-align:start;padding-left: 5px;">
                                <h5 class="display-6" style="text-align:start">{{name.value}}</h5>
                                <div class="row align--center justify-content--start">
                                    <div class="flex text--secondary" style="font-size: 16px;">
                                        <p>{{name.lang}}</p>
                                    </div>
                                    <div class="flex">
                                        <va-icon style="margin-left:5px" name="language"/>
                                    </div>
                                </div>
                                <div class="row align--center justify-content--start">
                                    <div v-if="name.locality" class="flex text--secondary" style="font-size: 16px;">
                                        <p>{{name.locality}}</p>
                                    </div>
                                    <div class=flex>
                                        <va-icon style="margin-left:5px" name="location_on"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </va-card>
                </div>
            </div>
        </div>
        <div v-if="organism.publications && organism.publications.length" class="custom-card">
            <div class="row">
                <div class="flex">
                    <h3 style="text-align:start" class="display-3">
                        Publications
                    </h3>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <va-card v-for="(pub,index) in organism.publications" style="margin:10px" :key="index" class="child-container box">
                        <div class="row align--center justify--start">
                            <div class="flex lg8 md8 sm8 xs8" style="text-align:start;padding-left: 5px;">
                                <h5 class="display-6" style="text-align:start">{{pub.id}}</h5>
                                <div class="row align--center justify-content--space-between">
                                    <div class="flex text--secondary" style="font-size: 16px;">
                                        <p>{{pub.source}}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </va-card>
                </div>
            </div>
        </div>
        <div v-if="organism.bioprojects && organism.bioprojects.length" class="custom-card">
            <div class="row">
                <div class="flex">
                    <h3 style="text-align:start" class="display-3">
                        BioProjects
                    </h3>
                </div>
            </div>
            <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                    <va-card v-for="(node,index) in organism.bioprojects" :key="index" style="margin:10px" class="child-container box">
                        <div class="row justify--space-between align--center">
                            <div class="flex lg12 md12 sm12 xs12" style="text-align:start;padding-left: 5px;">
                                <h5 class="display-6" style="text-align:start">{{node.title}}</h5>
                                <div class="row align--center justify-content--start">
                                    <div class="flex text--secondary" style="font-size: 16px;">
                                        <p style="text-align:start">{{node.accession}}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </va-card>
                </div>
            </div>
        </div>
        <div class="custom-card">
            <div class="row">
                <div class="flex">
                    <h3 style="text-align:start" class="display-3">
                        Lineage
                    </h3>
                </div>
            </div>
            <div class="row" >
                <div class="flex lg12 md12 sm12 xs12">
                    <va-card v-for="(node,index) in organism.taxon_lineage" :key="index" style="margin:10px" class="child-container box">
                        <div class="row align--center justify--start">
                            <div class="flex lg8 md8 sm8 xs8" style="text-align:start;padding-left: 5px;">
                                <h5 class="display-6" style="text-align:start">{{node.name}}</h5>
                                <div class="row align--center justify-content--start">
                                    <div class="flex text--secondary" style="font-size: 16px;">
                                        <p style="text-align:start">{{node.rank}}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </va-card>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>

const props = defineProps({
    organism:Object
})
</script>
