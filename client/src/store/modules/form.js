import {mappedFields} from '../../utils/helper'

const getDefaultState = () => {
    return {
        sampleForm: {
            organism_part:'',
            lifestage:'',
            project_name:'', //should get project name from env variable
            tolid:'',
            barcoding_center:'',
            collected_by:'',
            collection_date:'',
            geographic_location_country:'',
            geographic_location_latitude:{text:'',unit: 'DD'},
            geographic_location_longitude:{text:'',unit: 'DD'},
            geographic_location_region_and_locality:'',
            identified_by:'',
            geographic_location_depth:{text:'',unit: 'm'},
            geographic_location_elevation:{text:'', unit: 'm'},
            habitat:'',
            identifier_affiliation:'',
            original_collection_date:'',
            original_geographic_location:'',
            sample_derived_from:'',
            sample_same_as:'',
            sample_symbiont_of:'',
            sample_coordinator:'',
            sample_coordinator_affiliation:'',
            sex:'',
            relationship:'',
            symbiont:'',
            collecting_institution:'',
            GAL:'',
            specimen_voucher:'',
            specimen_id:'',
            GAL_sample_id:'',
            culture_or_strain_id:'',
            sample_unique_name: '',
        },
        taxid: '',
        scientificName: '',
        commonNames:'',
        index: 0
    }
  }

const state = getDefaultState()

const mutations= {
    updateform (state, payload){
        if (state.sampleForm[payload.label].unit){
            state.sampleForm[payload.label].text = payload.value
        }else{
            state.sampleForm[payload.label] = payload.value
        }
    },
    increment(state){
        state.index++
    },
    decrement(state){
        state.index--
    },
    resetState(state){
        Object.assign(state, getDefaultState())
    },
    //load sample into form
    loadSample(state, payload){
        Object.keys(mappedFields).forEach(key => {
            if(payload[key]){
                state.sampleForm[mappedFields[key]].text = payload[key].text
            }
        })
    },
    setField(state, payload){
        state[payload.label] = payload.value
    },
}
const actions= {
    increment(context) {
        context.commit('increment')
    },
    decrement(context) {
        context.commit('decrement')
    },
    reset(context){
        context.commit('resetState')
    }
}
const getters = {
    getIndex(state) {
        return state.index
    },
    getSampleForm(state){
        return state.sampleForm
    }
}
export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
  }
