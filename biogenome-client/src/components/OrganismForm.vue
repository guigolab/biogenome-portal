<template>
    <!-- <va-card class="custom-card">
        <va-card-title>
            Organism filters
        </va-card-title>
        <va-card-content> -->
            <div class="row">
                <div class="flex lg6 md6">
                    <va-select
                        v-if="showBioprojectInput"
                        v-model="selectedProject"
                        label="Bioprojects"
                        :options="options"
                        clearable
                        style="padding:10px"
                    />
                </div>
                <div class="flex lg3 md3">
                    <va-select
                        label="search field"
                        v-model="orgStore.query.filter_option"
                        :options="['tolid','taxid','common_name']"
                        style="padding:10px"
                        :disabled="Boolean(orgStore.query.filter)"
                        clearable
                    />
                </div>
                <div class="flex lg3 md3">
                    <va-input
                        label="filter"
                        placeholder="search organism"
                        v-model="orgStore.query.filter"
                        style="padding:10px"
                    >
                        <template #appendInner>
                            <va-icon
                                name="search"
                            />
                        </template>
                    </va-input>
                </div>
            </div>

</template>
<script setup>
import { onMounted, reactive, nextTick, ref, watch } from 'vue'
import {PROJECT_ACCESSION} from '../../config'
import DataPortalService from '../services/DataPortalService'
import {organisms} from '../stores/organisms'

const orgStore = organisms()
var showBioprojectInput = ref(false)
var selectedProject = ref(null)
var options = []
var project ={}

watch(selectedProject, ()=>{
    orgStore.query.bioproject = selectedProject.value.value
})

onMounted(()=>{
    if(PROJECT_ACCESSION){
        DataPortalService.getBioProjectChildren(PROJECT_ACCESSION)
        .then(resp => {
            nextTick(()=>{
                project = {...resp.data}
                if (project.children && project.children.length){
                    options = project.children.map(child => {
                        return {text:child.title,value:child.accession}
                    })
                    showBioprojectInput.value = true
                }
                //map children for options
            })
        })
    }
})
</script>
