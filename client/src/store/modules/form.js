
const getDefaultState = () => {
    return {
        sampleForm: {
            organism_part:'',
            lifestage:'',
            project_name:'', //should get project name from env variable
            tolid:'',
            barcoding_center:'',
            collected_by:'',
            collector_orcid_id:'',
            collection_date:'',
            time_of_collection:'',
            description_of_collection_method:'',
            geographic_location_country:'',
            geographic_location_latitude:'',
            geographic_location_longitude:'',
            geographic_location_region_and_locality:'',
            grid_reference:'',
            identified_by:'',
            identified_how:'',
            geographic_location_depth:'',
            geographic_location_elevation:'',
            habitat:'',
            identifier_affiliation:'',
            original_collection_date:'',
            original_geographic_location:'',
            sample_derived_from:'',
            sample_same_as:'',
            sample_symbiont_of:'',
            sample_coordinator:'',
            sample_coordinator_affiliation:'',
            sample_coordinator_orcid_id:'',
            preserved_by:'',
            preserver_affiliation:'',
            preservation_approach:'',
            preservative_solution:'',
            barcode_plate_preservative:'',
            time_elapsed_from_collection_preservation:'',
            date_of_preservation:'',
            sex:'',
            relationship:'',
            symbiont:'',
            collecting_institution:'',
            GAL:'',
            specimen_voucher:'',
            specimen_id:'',
            specimen_id_risk:'',
            tube_or_well_id:'',
            tissue_for_barcoding:'',
            purpose_of_specimen:'',
            hazard_group:'',
            other_informations:'',
            regulatory_compliance:'',
            indigenous_rights_applicable:'',
            associated_traditional_knowledge_applicable:'',
            ethics_permits_mandatory:'',
            sampling_permits_mandatory:'',
            nagoya_permits_mandatory:'',
            tissue_for_biobanking:'',
            taxon_remarks:'',
            infraspecific_epithet:'',
            dna_removed_from_biobanking:'',
            tissue_removed_from_barcoding:'',
            tube_or_well_id_for_barcoding:'',
            tissue_voucher_id_for_biobanking:'',
            dna_voucher_id_for_biobanking:'',
            difficult_or_high_priority_sample:'',
            size_of_tissue_in_tube:'',
            GAL_sample_id:'',
            collector_sample_id:'',
            culture_or_strain_id:'',
            taxid: '',
            scientificName: '',
            common_name:'',
        },
        index: 0,
        toUpdate:false,
    }
  }

const state = getDefaultState()

const mutations= {
    updateform (state, payload){
        state.sampleForm[payload.label] = payload.value
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
        Object.keys(state.sampleForm).forEach(key => {
            if (key in payload){
                state.sampleForm[key] = payload[key]
            }else{
                state.sampleForm[key] = ''
            }
        })
        if (payload.accession){
            state.sampleForm['tube_or_well_id'] = payload.accession
        }
        // use tube_or_well_id as a placeholder for accession in case of already public samples
        state.index = 0
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
