import {mappedFields} from '../../static-config'

const getDefaultState = () => {
    return {
        sampleForm: {
            organism_part:{text:''},
            lifestage:{text:''},
            project_name:{text:'CBP'}, //should get project name from env variable
            tolid:{text:''},
            barcoding_center:{text:''},
            collected_by:{text:''},
            collection_date:{text:''},
            geographic_location_country:{text:''},
            geographic_location_latitude:{text:'',unit: 'DD'},
            geographic_location_longitude:{text:'',unit: 'DD'},
            geographic_location_region_and_locality:{text:''},
            identified_by:{text:'',},
            geographic_location_depth:{text:'',unit: 'm'},
            geographic_location_elevation:{text:'', unit: 'm'},
            habitat:{text:''},
            identifier_affiliation:{text:''},
            original_collection_date:{text:''},
            original_geographic_location:{text:''},
            sample_derived_from:{text:''},
            sample_same_as:{text:''},
            sample_symbiont_of:{text:''},
            sample_coordinator:{text:''},
            sample_coordinator_affiliation:{text:''},
            sex:{text:''},
            relationship:{text:''},
            symbiont:{text:''},
            collecting_institution:{text:''},
            GAL:{text:''},
            specimen_voucher:{text:''},
            specimen_id:{text:''},
            GAL_sample_id:{text:'',},
            culture_or_strain_id:{text:''},
            taxId: {text:''},
            alias: {text:''},
            scientificName: {text: ''}
        },
        index: 0
    }
  }

const state = getDefaultState()

const mutations= {
    updateform (state, payload){
        state.sampleForm[payload.label].text = payload.value
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
