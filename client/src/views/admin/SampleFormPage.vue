<template>
<b-row>
<b-col>
    <b-container class="router-container">
    <b-row>
        <b-col>
    <div>
        <b-progress-bar style="min-height:10px" :value="index+1" :max="groups.length" variant="success" striped="true"></b-progress-bar>
    </div>
    <b-card class="card-container">
    <template #header>
        <b-button-toolbar key-nav justify>
            <b-button-group class="mx-1">
                <b-button :disabled="index <= 0" @click="updatePage(-1)">Previous</b-button>
                <b-button @click="resetForm()" variant="danger">Reset</b-button>  
            </b-button-group>
            <b-button-group class="mx-1"> 
                <b-button v-if="index < groups.length-1"  @click="updatePage(1)">Next</b-button>
                <b-button :disabled="toUpdate ? false : !validSample" v-else @click="submit()" variant="primary">Submit sample</b-button>
            </b-button-group>
        </b-button-toolbar>
    </template>
    <b-form-group
            label-cols-lg="3"
            :label="groups[index].description? groups[index].description:groups[index].name"
            label-size="lg"
            label-class="font-weight-bold pt-0"
            class="mb-0"
            >
            <b-form-group label-cols-sm="3"
                label-align-sm="right" :label-class="labelClass(field)"
                :label-for="field.label" :label="field.mandatory === 'mandatory'? field.label+' *':field.label"  v-for="field in groups[index].fields" 
                :key="field.label" :description="field.description">
                <div v-if="isMultipleChoice(field)">
                    <b-form-select
                        :id="field.label"
                        :ref="field.label"
                        v-model="self[field.model]"
                        :options="field.options"
                        :state="toUpdate && COPOlabels.includes(field.label) ? null :  validateInput(field,self[field.model])"
                    >
                    </b-form-select>
                </div>
                <div v-if="isTextInput(field)">
                    <b-input-group :prepend="field.model==='taxid'? scientificName : null"
                    :append="field.units? field.units: null">
                        <b-form-input
                            v-if="field.model==='taxid'"
                            :disabled=" toUpdate ? toUpdate : Boolean(scientificName)"
                            ref="taxid"
                            id="taxid"
                            v-model="taxid"
                            :state="toUpdate ? null : Boolean(scientificName) && Boolean(taxid)"
                        >
                        </b-form-input>
                        <b-form-input v-else
                            :ref="field.label"
                            :id="field.label"
                            v-model="self[field.model]"
                            :state="toUpdate && field.label === 'sample unique name'? null : validateInput(field,self[field.model])"
                            :disabled="disableUniqueFields(field.model)"
                            >
                        </b-form-input>
                        <b-input-group-append v-if="field.model==='taxid'">
                            <b-button :disabled="disableUniqueFields(field.model) || Boolean(scientificName)" @click="getTaxon()">Get Taxon</b-button>
                        </b-input-group-append>
                        <b-input-group-append v-if="Boolean(scientificName) && field.model==='taxid'">
                            <b-button :disabled="disableUniqueFields(field.model)" @click="resetTaxon()">Reset taxon</b-button>
                        </b-input-group-append>
                    </b-input-group>
                </div>
                <div v-if="isTextAreaInput(field)">
                    <b-form-textarea
                    :id="field.label"
                    v-model="self[field.model]"
                    :state="validateInput(field,self[field.model])"
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
                <b-button @click="resetForm()" variant="danger">Reset</b-button>  
            </b-button-group>
            <b-button-group class="mx-1"> 
                <b-button v-if="index < groups.length-1"  @click="updatePage(1)">Next</b-button>
                <b-button :disabled="toUpdate ? false : !validSample" v-else @click="submit()" variant="primary">Submit sample</b-button>
            </b-button-group>
        </b-button-toolbar>
    </template>
    </b-card>
    </b-col>
    </b-row>
    </b-container>
</b-col>
</b-row>
</template>
<script>

import enaService from "../../services/ENAClientService"
import { mapCheckListFields,showConfirmationModal} from "../../utils/helper"
import {checklistFieldGroups, mandatoryCOPOLabels} from '../../utils/static-config'
import {BButton, BButtonGroup, BButtonToolbar,
BFormGroup,BCard, BFormSelect, 
BFormInput, BFormTextarea, BProgressBar, BInputGroup} from 'bootstrap-vue'
import SubmissionService from '../../services/SubmissionService'


const modelFields = [].concat.apply(checklistFieldGroups.map(group => group.fields).map(fields => fields.map(field => field.model))).flat(1)
modelFields.push('scientificName')
// const SampleToSubmitModal = () => import(/* webpackPrefetch: true */ '../modal/SampleToSubmitModal.vue')

export default {
    components:{BButton, BButtonGroup, 
    BFormGroup,BCard, BFormSelect,BButtonToolbar,
    BFormInput, BFormTextarea,BProgressBar, BInputGroup},
    data(){
        return {
             // use taxonId for ENA request and taxId from parent for validation/store model
            sample: null,
            groups: checklistFieldGroups,
            self: this, // bad practice declaring an attribute of the element which contains the element itself but necessary to dynamically bind vmodel
            COPOlabels: mandatoryCOPOLabels,
            
        }
    },
    computed: {
        index() {
            return this.$store.getters['form/getIndex']
        },
        toUpdate(){
            return this.$store.getters['form/getToUpdate']
        },
        validSample(){
            return this.sample_unique_name && this.scientificName
        },
        samplesToSubmit(){
            return this.$store.getters['submission/getSamplesToSubmit']
        },
        ...mapCheckListFields({
            fields: modelFields,
            base: "sampleForm",
            mutation: "form/updateform"
        }),
    },
    methods:{
        labelClass(field){
            return field.label === 'taxon ID' && !this.toUpdate ?
                    this.scientificName ? 'success': 'wrong' 
                    : 
                    this.validateInput(field,this[field.model]) === null || (this.toUpdate && mandatoryCOPOLabels.includes(field.label)) ? 
                    '' : this.validateInput(field,this[field.model]) ? 
                            'success':'wrong'            

        },
        resetForm(){
            showConfirmationModal(this.$bvModal,'This will reset the form and delete any unsaved progress')
            .then(value => {
                if(value){
                    this.$store.dispatch('form/reset')
                }
            })
        },
        isTextInput(field){
            return field.type == 'text_field'
        },
        disableUniqueFields(model){
            if ((model === 'sample_unique_name' || model === 'taxid') &&
            this.toUpdate){
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
            return field.mandatory === 'mandatory'? 
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
            })
            .then(value => {
                if(value && this.scientificName){
                    return null
                }
                this.scientificName = ''
                return null
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
            const formData = new FormData()
            const form = this.$store.getters['form/getSampleForm']
            Object.keys(form).forEach(key => {
                if (form[key] !== ''){
                    formData.append(key, form[key])
                }
            })
            return formData
        },
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
                    return SubmissionService.createSample(metadata)
                }
                return null
            })                  
            .then(response => {
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