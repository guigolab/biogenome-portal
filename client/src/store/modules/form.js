
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
            taxid: '',
            scientificName: '',
            commonNames:'',
        },
        index: 0,
        toUpdate:false,
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
        console.log(Object.keys(payload))
        console.log(Object.keys(state.sampleForm))
        Object.keys(state.sampleForm).forEach(key => {
            if (key in payload){
                state.sampleForm[key] = payload[key]
            }else{
                if(state.sampleForm[key].unit){
                    state.sampleForm[key].text = ''
                }else{
                    state.sampleForm[key] = ''
                }
            }
        })
        // Object.assign(state.sampleForm, payload)
        // console.log(state.form)
        // Object.keys(mappedFields).forEach(key => {
        //     if(payload[key]){
        //         state.sampleForm[mappedFields[key]] = payload[key].text
        //     }
        // })
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
    },
    getToUpdate(state){
        return state.toUpdate
    }
}
export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
  }
