const state = () => ({
    samplesToSubmit: [],
    sampleXML: null,
    submissionXML: null,
})
const mutations= {
    addSample (state, payload){
        state.samplesToSubmit.push(payload)
    },
    removeSample (state, payload){
        state.samplesToSubmit = state.samplesToSubmit.filter(sample => 
            sample['sample unique name'] !== payload['sample unique name']
        )
    },
    setXML(state, payload){
        state.sampleXML = payload.file
    },
    resetSamples(state){
        state.samplesToSubmit = []
    }
}
const actions = {
    reset(context){
        context.commit('resetSamples')
    }
}

const getters= {
    getSamplesToSubmit(state){
        return state.samplesToSubmit
    },
    getSampleXML(state){
        return state.sampleXML
    }
}
export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
    }