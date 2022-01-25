<template>
<b-overlay opacity="1" :show="loading">
    <b-container class="router-container">
    <b-row>
        <b-col>
    <b-alert :show="showAlert" variant="danger">Fill all the mandatory fields before continuing</b-alert>
    <b-alert :show="showError" variant="danger">{{message}}</b-alert>
    <div style="min-height:50px">
        <b-button-toolbar>
            <b-button-group class="mx-1">
                <b-button :disabled="!validSample" @click="addSample()" variant="primary"><b-icon icon="plus"></b-icon>Add another sample</b-button>
            </b-button-group>
            <b-dropdown v-if="samplesToSubmit.length > 0" no-caret>
                <template #button-content pill >
                    Samples
                    <b-badge variant="light">{{samplesToSubmit.length}}</b-badge>
                </template>
                <b-dropdown-item-button v-for="sample in samplesToSubmit" :key="sample['sample unique name']" @click="showDetails(sample)">{{sample['sample unique name'].text}}</b-dropdown-item-button>
            </b-dropdown>
        </b-button-toolbar>
    </div>
    <div>
        <b-progress-bar style="min-height:10px" :value="index+1" :max="groups.length" variant="success" striped="true"></b-progress-bar>
    </div>
    <b-card class="card-container">
    <b-form-group
            label-cols-lg="3"
            :label="groups[index].description? groups[index].description:groups[index].name"
            label-size="lg"
            label-class="font-weight-bold pt-0"
            class="mb-0"
            >
            <b-form-group label-cols-sm="3"
                label-align-sm="right" :label-class="field.label === 'taxon ID' ? 
                    Boolean(scientificName) ? 'success': 'wrong' 
                    : 
                    validateInput(field,self()[mappedFields[field.label]]) === null ? 
                    '' : validateInput(field,self()[mappedFields[field.label]]) ? 
                            'success':'wrong'"
                :label-for="field.label" :label="field.mandatory === 'mandatory'? field.label+' *':field.label"  v-for="field in groups[index].fields" 
                :key="field.label" :description="field.description">
                <div v-if="isMultipleChoice(field)">
                    <b-form-select
                        :id="field.label"
                        :ref="field.label"
                        v-model="self()[mappedFields[field.label]]"
                        :options="field.options"
                        :state="validateInput(field,self()[mappedFields[field.label]])"
                    >
                    </b-form-select>
                </div>
                <div v-if="isTextInput(field)">
                    <b-input-group :prepend="field.label===taxIdField? scientificName : null"
                    :append="field.units? field.units: null">
                        <b-form-input
                            v-if="field.label===taxIdField"
                            ref="taxonId"
                            id="taxonId"
                            v-model="taxonId"
                            :state="Boolean(scientificName) && Boolean(taxId)"
                        >
                        </b-form-input>
                        <b-form-input v-else
                            :ref="field.label"
                            :id="field.label"
                            v-model="self()[mappedFields[field.label]]"
                            :state="validateInput(field,self()[mappedFields[field.label]])">
                        </b-form-input>
                        <b-input-group-append v-if="field.label===taxIdField">
                            <b-button @click="getTaxon(taxonId)">Get Taxon</b-button>
                        </b-input-group-append>
                    </b-input-group>
                </div>
                <div v-if="isTextAreaInput(field)">
                    <b-form-textarea
                    :id="field.label"
                    v-model="self()[mappedFields[field.label]]"
                    :state="validateInput(field,self()[mappedFields[field.label]])"
                    rows="3"
                    max-rows="6"
                    ></b-form-textarea>
                </div>
        </b-form-group>
    </b-form-group>
    <template #footer>
        <b-button-toolbar justify>
            <b-button-group class="mx-1">
                <b-button :disabled="index <= 0" @click="updatePage(-1)">Previous</b-button>  
            </b-button-group>
            <b-button-group class="mx-1"> 
                <b-button v-if="index < groups.length-1"  @click="updatePage(1)">Next</b-button>
                <b-button :disabled="!validSample" v-else @click="submit()" variant="primary">Submit to ENA</b-button>
            </b-button-group>
        </b-button-toolbar>
    </template>
    </b-card>
    <sample-to-submit-modal :sample="sample"/>
        </b-col>
    </b-row>
    </b-container>
</b-overlay>
</template>
<script>

import searchService from "../services/ENAClientService"
import { mapCheckListFields,showConfirmationModal, xmlParser } from '../helper'
import {checklistFieldGroups, mappedFields} from '../static-config'
import submissionService from "../services/SubmissionService"
import { BOverlay,BButton,BButtonToolbar, BButtonGroup, 
BFormGroup,BCard,BBadge,BDropdownItemButton, BFormSelect, 
BFormInput, BFormTextarea, BAlert, BProgressBar,
BDropdown, BInputGroup} from 'bootstrap-vue'

// 



const SampleToSubmitModal = () => import(/* webpackPrefetch: true */ '../components/modal/SampleToSubmitModal.vue')

export default {
    components:{SampleToSubmitModal,BOverlay,BButton,BButtonToolbar, BButtonGroup, 
    BFormGroup,BCard,BBadge,BDropdownItemButton, BFormSelect, 
    BFormInput, BFormTextarea, BAlert, BProgressBar,
    BDropdown, BInputGroup},
    data(){
        return {
            taxonId: '', // use taxonId for ENA request and taxId from parent for validation/store model
            showAlert:false,
            showError: false,
            sample: null,
            groups: checklistFieldGroups,
            message:'',
            mappedFields: mappedFields,
            taxIdField: 'taxon ID',
            taxon: null
        }
    },
    computed: {
        index() {
            return this.$store.getters['form/getIndex']
        },
        validSample(){
            return this.alias && this.scientificName
        },
        samplesToSubmit(){
            return this.$store.getters['submission/getSamplesToSubmit']
        },
        ...mapCheckListFields({
            fields: [
                'organism_part','lifestage',
                'project_name','tolid','barcoding_center',
                'collected_by','collection_date','geographic_location_country','geographic_location_latitude','geographic_location_longitude','geographic_location_region_and_locality','identified_by','geographic_location_depth','geographic_location_elevation','habitat','identifier_affiliation','original_collection_date','original_geographic_location',
                'sample_derived_from','sample_same_as','sample_symbiont_of','sample_coordinator','sample_coordinator_affiliation',
                'sex','relationship','symbiont',
                'collecting_institution','GAL',
                'specimen_voucher','specimen_id','GAL_sample_id',
                'culture_or_strain_id',
                'alias','scientificName','taxId'
            ],
            base: "sampleForm",
            mutation: "form/updateform"
        }),
    },
    methods:{
        //can't call this on template, every time self method is called it triggers all the computed properties
        self() {
            return this
        },
        isTextInput(field){
            return field.type == 'text_field'
        },
        isTextAreaInput(field){
            return field.type == 'text_area_field'
        },
        isMultipleChoice(field){
            return field.type == 'text_choice_field'
        },
        //should check why method is triggered for each input when changing only one (suggestion convert v-model to value and change)
        validateInput(field, property){
            return field.mandatory === 'mandatory' ? 
                    field.regex ? 
                        new RegExp(field.regex).test(property) 
                        : 
                        Boolean(property)
                    : //else
                    field.regex && Boolean(property) ?
                         new RegExp(field.regex).test(property) 
                         : 
                         null 
        },
        updatePage(number){
            if (number > 0){
                if(document.getElementsByClassName('wrong').length > 0){
                    this.showAlert = true
                    return
                }else{
                    this.$store.dispatch('form/increment')
                }  
            }
            else{
                this.$store.dispatch('form/decrement')
            }
            this.showAlert=false
        },
        getTaxon(taxId){
            this.showError = false
            searchService.getEnaRecord(taxId)
            .then(response => {
                return xmlParser(response.data)
            })
            .then(result => {
                this.taxon = result.TAXON_SET.taxon[0]
                return showConfirmationModal(this.$bvModal,this.taxon.$.scientificName)
            })
            .then(value => {
                if(value && this.taxon){
                    this.scientificName = this.taxon.$.scientificName
                    this.taxId = this.taxon.$.taxId
                }
                this.taxon = null
                return null
            })
            .catch(e => {
                this.message = e
                this.showError = true
            });
        },
        parseSample(){
            const sample = JSON.parse(JSON.stringify(Object.keys(this.$store.getters['form/getSampleForm'])
            .filter((key) => this.$store.getters['form/getSampleForm'][key].text !== '')
            .reduce((a, k) => ({ ...a, [Object.keys(mappedFields).find(key => mappedFields[key] === k)]: this.$store.getters['form/getSampleForm'][k]}), {})))
            return sample
        },
        addSample(){
            this.$store.commit('submission/addSample', this.parseSample()) // push sample to store samples list
            this.$store.dispatch('form/reset') //reset form fields and index
            this.taxonId = ''
        },
        showDetails(sample){
            this.sample = sample
            this.$nextTick(() => {
                this.$root.$emit('bv::show::modal', 'sample-to-submit')
            })
        },
        submit(){
            showConfirmationModal(this.$bvModal,'Generate XML and checkout to ENA submission page?')
            .then(value => {
                console.log(value)
                if(value){
                    this.$store.commit('submission/addSample', this.parseSample())
                    return submissionService.generateXML(this.$store.getters['submission/getSamplesToSubmit'])
                }
                return null  
            })
            .then(response => {
                const blob = new Blob([response.data], { type: 'application/octet-stream'})
                const file = new File([blob],"samples.xml",{type:"xml"})
                this.$store.commit('submission/setXML', {file: file})
                this.$router.push({name:'ENA submission'})
                this.$store.dispatch('submission/resetSamples')
                this.$store.dispatch('form/reset')
            })
            .catch(err => {
                console.log(err)
            })
        }
    }
}
</script>
<style>
.card-container{
    margin-top: 10px;
    margin-bottom: 10px;
    min-height: 65vh;
}

.wrong {
    color: #dc3545
}
.success {
    color: #28a745
}
</style>