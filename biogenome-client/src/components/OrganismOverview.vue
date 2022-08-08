<template>
    <div class="flex lg12 md12 sm12 xs12">
        <div>
            <va-card class="custom-card" >
                <va-card-title>Lineage</va-card-title>
                <va-card-content>
                    <div style="padding:15px" class="row align--center custom-card">
                        <div style="display:contents" class="flex">
                            <p style="padding:5px" v-for="(taxon,index) in organism.taxon_lineage" :key="index">{{taxon.name}} ({{taxon.rank}})</p>
                        </div>
                    </div>
                </va-card-content>
            </va-card>
        </div>
        <div>
            <va-card class="custom-card" >
                <va-card-title>BioProjects</va-card-title>
                <va-card-content>
                    <div style="padding:15px" class="row align--center custom-card">
                        <div style="display:contents" class="flex">
                            <p style="padding:5px" v-for="(project,index) in organism.bioprojects" :key="index">{{project.title}} ({{project.accession}})</p>
                        </div>
                    </div>
                </va-card-content>
            </va-card>
        </div>
        <div v-if="Object.keys(organism.metadata).length">
            <va-card class="custom-card" >
                <va-card-title>Metadata</va-card-title>
                <va-card-content>
                    <div style="padding:15px" v-for="(key,index) in Object.keys(organism.metadata)" :key="index" class="row align--center custom-card">
                        <div class="flex">
                            <p><strong>{{key}}:</strong></p>
                        </div>
                        <div class="flex">
                            <p>{{organism.metadata[key]}}</p>
                        </div>
                    </div>
                </va-card-content>
            </va-card>
        </div>
        <div v-if="organism.common_names.length">
            <va-card class="custom-card" >
                <va-card-title>Vernacular Names</va-card-title>
                <va-card-content>
                    <div style="padding:15px" v-for="(name,index) in organism.common_names" :key="index" class="row align--center custom-card">
                        <div class="flex">
                            <p style="padding-right:15px"><strong>{{name.value}}</strong></p>
                        </div>
                        <div class="flex">
                            <va-chip size="small" outline icon="language">{{name.lang}}</va-chip>
                            <va-chip v-if="name.locality" size="small" outline icon="location_on">{{name.locality}}</va-chip>
                        </div>
                    </div>
                </va-card-content>
            </va-card>
        </div>
        <div v-if="organism.publications.length">
            <va-card class="custom-card" >
                <va-card-title>Publications</va-card-title>
                <va-card-content>
                    <div style="padding:15px" v-for="(pub,index) in organism.publications" :key="index" class="row align--center custom-card">
                        <div class="flex">
                            <p style="padding-right:15px"><strong>{{pub.id}}</strong></p>
                        </div>
                        <div class="flex">
                            <va-chip size="small" outline>{{pub.source}}</va-chip>
                        </div>
                    </div>
                </va-card-content>
            </va-card>
        </div>
    </div>
</template>
<script setup>

const props = defineProps({
    organism:Object
})
</script>
