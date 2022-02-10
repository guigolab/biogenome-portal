<template>
   <b-modal v-if="Boolean(sample)" no-close-on-backdrop ok-only id="sample-to-submit" scrollable :title="sample['sample unique name'].text">
    <p class="my-4" v-for="key in Object.keys(sample)" :key="key">
      <strong>{{key}}: </strong>{{sample[key].text}}
    </p>
    <template #modal-footer="{hide}">
        <div>
            <b-button-toolbar justify>
                <b-button-group class="mx-1">
                    <b-button @click="removeSample()" variant="danger">Remove Sample</b-button>
                </b-button-group>
                <b-button-group class="mx-1">
                    <b-button @click="editSample()" variant="primary">Edit Sample</b-button>
                </b-button-group>
                <b-button-group class="mx-1">
                    <b-button @click="hide()">Close</b-button>
                </b-button-group>
            </b-button-toolbar>
        </div>
      </template>
  </b-modal>
</template>
<script>
import {BButton,BButtonToolbar, BButtonGroup} from 'bootstrap-vue'
import {showConfirmationModal} from '../../utils/helper'

export default {
    props: ['sample'],
    components: {BButton,BButtonToolbar, BButtonGroup},
    methods: {
        removeSample(){
            showConfirmationModal(this.$bvModal,'Please confirm that you want to delete this sample.')
            .then(value => {
                if(value){
                    this.$store.commit('submission/removeSample', this.sample)
                    this.$nextTick(() => {
                        this.$root.$emit('bv::hide::modal', 'sample-to-submit')
                    })
                } 
            })
            .catch(err => {
                console.log(err)
            })
        },
        editSample(){
            showConfirmationModal(this.$bvModal, 'Edit Sample?')
            .then(value => {
                if(value){
                    this.$store.commit('form/loadSample', this.sample)
                    this.$store.commit('submission/removeSample', this.sample)
                    this.$nextTick(() => {
                        this.$root.$emit('bv::hide::modal', 'sample-to-submit')
                    })
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
