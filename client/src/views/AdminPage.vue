<template>
    <b-button-toolbar>
        <b-button-group>
            <b-button @click="createSample()">
                Create Sample
            </b-button>
        </b-button-group>
        <b-button-group>
        </b-button-group>
    </b-button-toolbar>
</template>

<script>
import {BButtonToolbar,BButtonGroup,BButton} from 'bootstrap-vue'
// import submissionService from "../services/SubmissionService"
import {mapFields} from '../helper'
import axios from 'axios'

/*
Steps for admin feature:



*/


export default {
       data(){
           return {
               test:'test'
           }
       },
       computed: {
        ...mapFields({
            fields: ['token','user'],
            module: 'submission',
            mutation: 'submission/setField' 
        })
    },
    components: {
        BButtonToolbar,BButtonGroup,BButton
    },
    methods: {
        createSample(){
            const data = new FormData
            data.append('test', this.test)
            axios.post(process.env.BASE_URL + "api"+"/organisms", data, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                }
            })
            // submissionService.createSample(data, this.token)
            .then(response => {
                console.log(response)
            })
            .catch(error => {
                if(error.response && error.response.status === 401){
                    this.user = ''
                    this.token = null
                    this.$router.push('/login')
                }
            })
        },
        updateSample(){
            



        },
        deleteSample(){


        },
        uploadExcel(){


        },
        deleteSamples(){


        }
    }
}
</script>