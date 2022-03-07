<template>
   <b-modal v-if="hasValues" no-close-on-backdrop ok-only id="sample-to-submit" scrollable :title="sample.accession">
        <table-component :sticky-header="stickyHeader" :items="[metadata()]" :stacked="true">
            <template #cell(accession)="data">
                <b-link v-if="data.value" :href="'https://www.ebi.ac.uk/ena/browser/view/'+ data.value" target="_blank">{{data.value}}</b-link>
            </template>
        </table-component>
    <template #modal-footer="{hide}">
        <div>
            <b-button-toolbar justify>
                <b-button-group class="mx-1">
                    <b-button @click="submitSample()" variant="primary">Submit Sample</b-button>
                </b-button-group>
                <b-button-group class="mx-1">
                    <b-button @click="hide()">Cancel</b-button>
                </b-button-group>
            </b-button-toolbar>
        </div>
      </template>
  </b-modal>
</template>
<script>

import {BButton,BButtonToolbar, BButtonGroup, BLink} from 'bootstrap-vue'
import {showConfirmationModal} from '../../utils/helper'
import submissionService from '../../services/SubmissionService'
import TableComponent from '../base/TableComponent.vue'

export default {
    props: ['sample'],
    components: {BButton,BButtonToolbar, BButtonGroup, TableComponent, BLink},
    computed:{
        hasValues(){
            return Object.entries(this.sample).length
        }
    },
    methods: {
        submitSample(){
            showConfirmationModal(this.$bvModal, 'Submit this sample?')
            .then(value => {
                if(value){
                    this.$store.dispatch('portal/showLoading')
                    return submissionService.createSample(this.sample)
                } 
                return null   
            })
            .then(response => {
                if(response){
                    this.$store.commit('submission/setAlert',{variant:'success', message: response.data})
                    this.$store.dispatch('submission/showAlert')
                    
                }
            })
            .catch(err => {
                    this.$store.commit('submission/setAlert',{variant:'danger', message: err})
                    this.$store.dispatch('submission/showAlert')

            })
            this.$bvModal.hide('sample-to-submit')
            this.$store.dispatch('portal/hideLoading')
        },
        //parse sample to display but use back end parser to save it
        metadata(){
            const metadata={}
            if(this.hasValues){
                console.log(this.sample)
                const characteristics = this.sample.characteristics
                metadata.accession = this.sample.accession
                metadata.taxid = this.sample.taxid
                metadata.name = this.sample.name
                Object.keys(characteristics).forEach(key=>{
                    metadata[key] = characteristics[key][0].text
                })
            }
            console.log(metadata)
            return metadata
        }
    },
}

</script>

<style>
.list {
  text-align: left;
  max-width: 80vw;
  margin: auto;
}
</style>
