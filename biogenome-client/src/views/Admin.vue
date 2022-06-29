<template>
<div>
    <va-alert title="notifications" :color="authStore.message.color" border="left">
        {{authStore.message.text}}
    </va-alert>
    <div class="row">
        <div class="flex lg4 md4 sm12 xs12">
            <Login/>
        </div>
        <div class="flex lg8 md8 sm12 xs12">
            <LocalSamples/>
        </div>
    </div>
    <!-- <div class="row"> -->
        <!-- <div class="flex">
            <va-card>
                <va-card-title>
                    MENU
                </va-card-title>
                <va-card-content>
                    <ul>
                        <li v-for="type in dataTypes" :key="type.label">
                            <div class="row justify--space-between">
                                <div class="flex">
                                    <router-link :to="type.path">{{type.label}}</router-link>
                                </div>
                                <div class="flex">
                                    <va-icon :to="type.path" :name="type.icon"/>
                                </div>
                            </div>
                        </li>
                    </ul>
                </va-card-content>
            </va-card>
        </div> -->
            <!-- <router-view/> -->
    <!-- </div> -->
</div>



</template>
<script setup>
import Login from '../components/admin/form/Login.vue'
import LocalSamples from '../components/admin/LocalSamples.vue'
import { nextTick, reactive,ref } from "vue"
import submissionService from "../services/SubmissionService"
import {auth} from '../stores/auth'

const authStore = auth()

const dataTypes = [
    // {label:'organisms', icon:'group'}, // CRUD goat status, organism photo, publications
    {label:'local samples', icon:'group', path:'/local_samples'}, // CRUD pre-copo samples
    // {label:'assemblies',icon:'group'}, //can modify only assembly track
    // {label:'annotations',icon:'group'}, // CRUD annotation
    // {label:'reads',icon:'group'}, // import/delete reads
    // {label:'users',icon:'group'}, // crud for users  only super admin
]


</script>