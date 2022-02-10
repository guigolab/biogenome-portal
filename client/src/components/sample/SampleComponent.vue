<template>
    <div>
        <table-component :sticky-header="stickyHeader" :fields="sampleFields" :items="samples">
            <template #cell(accession)="data">
                <b-link v-if="data.value" :to="{name: 'sample-details', params: {accession: data.value}}">{{data.value}}</b-link>
            </template>
            <template #cell(sample_unique_name)="data">
                <b-link v-if="data.value" :to="{name: 'sample-details', params: {accession: data.value}}">{{data.value}}</b-link>
            </template>
            <template #cell(organism_part)="data">
                {{data.value? data.value : ''}}
            </template>
            <template #cell(sex)="data">
                {{data.value? data.value : ''}}
            </template>
            <template #cell(GAL)="data">
                {{data.value? data.value : ''}}
            </template>
            <template #cell(actions)="data">
                <b-link class="actions-link" @click="editSample(data['item'])">
                    <b-icon-pen-fill variant="primary"></b-icon-pen-fill>
                </b-link>
                <b-link @click="deleteSample(data['item'])">
                    <b-icon-trash-fill variant="danger"></b-icon-trash-fill>
                </b-link>
            </template>
        </table-component>
    </div>
</template>
<script>
import {BLink,BIconPenFill,BIconTrashFill} from 'bootstrap-vue'
import TableComponent from '../base/TableComponent.vue'
import { showConfirmationModal } from '../../utils/helper'
import submissionService from '../../services/SubmissionService'

export default {
  components: { TableComponent,BLink,BIconPenFill,BIconTrashFill },
    props:['samples'],
    data(){
        return {
            sampleStaticFields: [
                {key: 'sample_unique_name', label: 'Sample unique name'},
                {key: 'accession', label: 'BioSamples accession'},
                {key: 'organism_part', label: 'Organism Part'},
                {key: 'sex', label: 'Sex'},
                {key: 'GAL', label: 'GAL'},
            ],
            stickyHeader: '60vh',
        } 
    },
    computed:{
        sampleFields(){
            if(localStorage.getItem('token')){
                return this.sampleStaticFields.concat([{key:'actions',label:'Actions'}])
            }
            return this.sampleStaticFields
        }
    },
    methods:{
        deleteSample(sample){
            showConfirmationModal(this.$bvModal,'Please confirm that you want to delete the sample with id: '+sample.sample_unique_name)
            .then(value => {
                if(value){
                    if (sample.accession){
                        return submissionService.deleteSamples([sample.accession])
                    }
                    return submissionService.deleteSamples([sample.sample_unique_name])
                    // delete sample in db
                    // this.$store.commit('submission/removeSample', this.sample)
                    // this.$nextTick(() => {
                    //     this.$root.$emit('bv::hide::modal', 'sample-to-submit')
                    // })
                } 
            })
            .then(response => {
                console.log(response.data)
            })
            .catch(err => {
                console.log(err)
            })
        },
        editSample(sample){
            showConfirmationModal(this.$bvModal, 'Edit sample?')
            .then(value => {
                if(value){
                    //edit sample
                    this.$store.commit('form/loadSample', sample)
                    this.$store.commit('form/setField',{label:'toUpdate',value:true})
                    this.$router.push('/submit-sample')

                    // this.$store.commit('submission/removeSample', this.sample)
                    // this.$nextTick(() => {
                    //     this.$root.$emit('bv::hide::modal', 'sample-to-submit')
                    // })
                }      
            })
            .catch(err => {
                console.log(err)
            })
        }
    }
}
</script>
<style scoped>
.actions-link{
    margin-left: 5px;
    margin-right: 5px;
}
</style>