<template>
    <b-container class="router-container">
    <b-row>
        <b-col>
    <!-- <div style="min-height:50px">
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
    </div> -->
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
                    validateInput(field,self[mappedFields[field.label]]) === null ? 
                    '' : validateInput(field,self[mappedFields[field.label]]) ? 
                            'success':'wrong'"
                :label-for="field.label" :label="field.mandatory === 'mandatory'? field.label+' *':field.label"  v-for="field in groups[index].fields" 
                :key="field.label" :description="field.description">
                <div v-if="isMultipleChoice(field)">
                    <b-form-select
                        :id="field.label"
                        :ref="field.label"
                        v-model="self[mappedFields[field.label]]"
                        :options="field.options"
                        :state="validateInput(field,self[mappedFields[field.label]])"
                    >
                    </b-form-select>
                </div>
                <div v-if="isTextInput(field)">
                    <b-input-group :prepend="field.label===taxIdField? scientificName : null"
                    :append="field.units? field.units: null">
                        <b-form-input
                            v-if="field.label===taxIdField"
                            :disabled="Boolean(scientificName)"
                            ref="taxid"
                            id="taxid"
                            v-model="taxid"
                            :state="Boolean(scientificName) && Boolean(taxid)"
                        >
                        </b-form-input>
                        <b-form-input v-else
                            :ref="field.label"
                            :id="field.label"
                            v-model="self[mappedFields[field.label]]"
                            :state="validateInput(field,self[mappedFields[field.label]])"
                            :disabled="disableUniqueFields(field.label)"
                            >
                        </b-form-input>
                        <b-input-group-append v-if="field.label===taxIdField">
                            <b-button :disabled="disableUniqueFields(field.label)" @click="getTaxon()">Get Taxon</b-button>
                        </b-input-group-append>
                        <b-input-group-append v-if="Boolean(scientificName) && field.label===taxIdField">
                            <b-button :disabled="disableUniqueFields(field.label)" @click="resetTaxon()">Reset taxon</b-button>
                        </b-input-group-append>
                    </b-input-group>
                </div>
                <div v-if="isTextAreaInput(field)">
                    <b-form-textarea
                    v-if="field.label == 'local names'"
                    :id="field.label"
                    v-model="commonNames"
                    :state="validateCommonNames"
                    rows="3"
                    max-rows="6"
                    ></b-form-textarea>
                    <b-form-textarea
                    v-else
                    :id="field.label"
                    v-model="self[mappedFields[field.label]]"
                    :state="validateInput(field,self[mappedFields[field.label]])"
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
                <b-button :disabled="!validSample" v-else @click="submit()" variant="primary">Submit sample</b-button>
            </b-button-group>
        </b-button-toolbar>
    </template>
    </b-card>
    <sample-to-submit-modal :sample="sample"/>
        </b-col>
    </b-row>
    </b-container>
</template>
<script>

import enaService from "../../services/ENAClientService"
import { mapCheckListFields,showConfirmationModal} from '../../utils/helper'
import {checklistFieldGroups, mappedFields} from '../../utils/static-config'
// import submissionService from "../services/SubmissionService"
import {BButton, BButtonGroup, BButtonToolbar,
BFormGroup,BCard, BFormSelect, 
BFormInput, BFormTextarea, BProgressBar, BInputGroup} from 'bootstrap-vue'
import SubmissionService from '../../services/SubmissionService'

// 



const SampleToSubmitModal = () => import(/* webpackPrefetch: true */ '../modal/SampleToSubmitModal.vue')

export default {
    components:{SampleToSubmitModal,BButton, BButtonGroup, 
    BFormGroup,BCard, BFormSelect,BButtonToolbar,
    BFormInput, BFormTextarea,BProgressBar, BInputGroup},
    data(){
        return {
             // use taxonId for ENA request and taxId from parent for validation/store model
            sample: null,
            groups: checklistFieldGroups,
            mappedFields: mappedFields,
            taxIdField: 'taxon ID',
            self: this,
        }
    },
    computed: {
        index() {
            return this.$store.getters['form/getIndex']
        },
        validSample(){
            return this.specimen_id && this.scientificName
        },
        samplesToSubmit(){
            return this.$store.getters['submission/getSamplesToSubmit']
        },
        validateCommonNames(){
            if(!this.commonNames){
                return null
            }
            const arr = this.commonNames.split(',').map(name => name.trim())
            return arr && arr.length && new Set(arr).size === arr.length
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
                'culture_or_strain_id','sample_unique_name',
                'scientificName','taxid', 'commonNames'
            ],
            base: "sampleForm",
            mutation: "form/updateform"
        }),
    },
    methods:{
        //can't call this on template, every time self method is called it triggers all the computed properties
        isTextInput(field){
            return field.type == 'text_field'
        },
        disableUniqueFields(label){
            if ((label === 'sample unique name' || label === 'taxon ID') &&
            this.$store.getters['form/getToUpdate']){
                return true
            }
            return false
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
                    this.$store.commit('submission/setAlert',{variant: 'danger',message: 'Fill all the mandatory fields before continuing'})
                    this.$store.dispatch('submission/showAlert')
                    return
                }else{
                    this.$store.dispatch('form/increment')
                }  
            }
            else{
                this.$store.dispatch('form/decrement')
            }
        },
        getTaxon(){
            this.$store.dispatch('portal/showLoading')
            enaService.getTaxon(this.taxid)
            .then(response => {
                this.scientificName = response.data[0].description
                this.$store.dispatch('portal/hideLoading')
                return showConfirmationModal(this.$bvModal,this.scientificName)
                // return xmlParser(response.data)
            })
            .catch(e => {
                this.$store.dispatch('portal/hideLoading')
                this.$store.commit('submission/setAlert',{variant: 'danger',message: e})
                this.$store.dispatch('submission/showAlert')
            });
        },
        resetTaxon(){
            this.taxid = ''
            this.scientificName = ''
        },
        parseSample(){
            const form = this.$store.getters['form/getSampleForm']
            const metadata = {}
            Object.keys(form).forEach(key => {
                if ((form[key].text && form[key].text !== '') || (form[key] !== 'object' && form[key] !== '')){
                    metadata[key] = form[key]
                }
            })
            return metadata
        },
        // addSample(){
        //     this.$store.commit('submission/addSample', this.parseSample()) // push sample to store samples list
        //     this.$store.dispatch('form/reset') //reset form fields and index
        //     this.taxonId = ''
        // },
        showDetails(sample){
            this.sample = sample
            this.$nextTick(() => {
                this.$root.$emit('bv::show::modal', 'sample-to-submit')
            })
        },
        submit(){
            showConfirmationModal(this.$bvModal,`Save the sample with ID ${this.sample_unique_name}?`)
            .then(value => {
                if(value){
                    const metadata = this.parseSample()
                    this.$store.dispatch('portal/showLoading')
                    if(this.$store.getters['form/getToUpdate']){
                        return SubmissionService.updateSample(metadata.sample_unique_name, metadata)
                    }
                    return SubmissionService.createSample({
                        metadata: metadata,
                        taxid: this.taxid,
                        name: this.scientificName,
                        commonNames: this.commonNames.split(',')
                    })
                }
                return null
            })                  
            .then(response => {
                console.log(response)
                this.$store.dispatch('portal/hideLoading')
                this.$store.commit('submission/setAlert', {variant: 'success', message: response.data})
                this.$store.dispatch('submission/showAlert')
                this.$store.dispatch('form/reset')
            })
            .catch(error => {
                console.log(error)
                this.$store.dispatch('portal/hideLoading')
                this.$store.commit('submission/setAlert', {variant: 'danger', message: error.response.data.message})
                this.$store.dispatch('submission/showAlert')               
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