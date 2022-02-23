<template>
    <div>
        <table-component :sticky-header="stickyHeader" :fields="sampleFields" :items="samples">
            <template v-if="hasToken" #head(actions)>
                <b-dropdown class="mx-1" dropup right text="Actions">
                    <!-- <b-dropdown-item @click="deleteSelectedSamples(samples)" variant="danger">Delete selected samples</b-dropdown-item> -->
                    <b-dropdown-item @click="deleteSamples(samples)" variant="danger">Delete selected samples</b-dropdown-item>
                    <b-dropdown-item @click="downloadExcel()">Download selected samples</b-dropdown-item>
                </b-dropdown>         
            </template>
            <template #cell(accession)="data">
                <b-link v-if="data.value" :to="{name: 'sample-details', params: {accession: data.value}}">{{data.value}}</b-link>
            </template>
            <template  #cell(sample_unique_name)="data">
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
                <b-link @click="deleteSamples([data['item']])">
                    <b-icon-trash-fill variant="danger"></b-icon-trash-fill>
                </b-link>
            </template>
        </table-component>
    </div>
</template>
<script>
import {BLink,BIconPenFill,BIconTrashFill, BDropdown, BDropdownItem} from 'bootstrap-vue'
import TableComponent from '../base/TableComponent.vue'
import { showConfirmationModal } from '../../utils/helper'
import submissionService from '../../services/SubmissionService'

export default {
  components: { TableComponent,BLink,BIconPenFill,BIconTrashFill,BDropdown,BDropdownItem },
    props:['samples', 'name'],
    data(){
        return {
            sampleStaticFields: [
                {key: 'sample_unique_name', label: 'Sample unique name'},
                {key: 'accession', label: 'Accession'},
                {key: 'organism_part', label: 'Organism part'},
                {key: 'sex', label: 'Sex'},
                {key: 'GAL', label: 'GAL'},
            ],
            stickyHeader: '60vh',
        } 
    },
    computed:{
        sampleFields(){
            if(this.hasToken){
                return this.sampleStaticFields.concat([{key:'actions',label:'Actions'}])
            }
            return this.sampleStaticFields
        },
        isLastSample(){
            return this.samples.length > 0 && this.samples.length === 1
        },
        hasToken(){
            return localStorage.getItem('token')
        }
    },
    methods:{
        deleteSamples(samples){
            const message = samples.length === this.samples.length ? 'Delete all samples and the species?' : 'Delete sample?'
            showConfirmationModal(this.$bvModal, message)
            .then(value => {
                if(value){
                    const ids = samples.map(sample => {
                        return sample.accession ? sample.accession : sample.sample_unique_name
                    }).join()
                    return submissionService.deleteSamples({ids: ids})
                } 
            })
            .then(response => {
                console.log(response.data)
                if (samples.length === this.samples.length){
                    this.$router.push('/')
                }
                this.$router.go()
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