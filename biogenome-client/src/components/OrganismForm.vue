<template>
    <va-card>
        <va-card-content>
            <va-select
                v-if="showBioprojectInput"
                v-model="selectedProject"
                label="Bioprojects"
                :options="options"
                clearable
            />
            <va-input
                label="filter"
                placeholder="search organism"
                v-model="orgStore.query.filter"
            >
                <template #prepend>
                    <va-select
                        label="search field"
                        v-model="orgStore.query.filter_option"
                        :options="['tolid','taxid','common_name']"
                        clearable
                    />
                </template>
                  <template #appendInner>
                        <va-icon
                            name="search"
                        />
                  </template>
            </va-input>
        </va-card-content>
    </va-card>
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
