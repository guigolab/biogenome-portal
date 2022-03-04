<template>
   <b-modal v-if="Boolean(sample)" no-close-on-backdrop ok-only id="sample-to-submit" scrollable :title="sample.accession">
    <p class="my-4" v-for="fieldObj in sample" :key="fieldObj.key">
      <strong>{{fieldObj.key}}: </strong>{{fieldObj.value}}
    </p>
    <template #modal-footer="{hide}">
        <div>
            <b-button-toolbar justify>
                <b-button-group class="mx-1">
                    <b-button @click="submitSample()" variant="primary">submit Sample</b-button>
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
import {BButton,BButtonToolbar, BButtonGroup} from 'bootstrap-vue'
import {showConfirmationModal} from '../../utils/helper'
import submissionService from '../../services/SubmissionService'

export default {
    props: ['sample'],
    components: {BButton,BButtonToolbar, BButtonGroup},
    methods: {
        submitSample(){
            showConfirmationModal(this.$bvModal, 'Submit this sample?')
            .then(value => {
                if(value){
                    return submissionService.updateSample(sample.accession, this.sample)
                } return null   
            })
            .then(response => {
                if(response){
                    console.log(response.data)
                }
            })
            .catch(err => {
                console.log(err)
            })
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
