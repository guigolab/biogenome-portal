const state = () => ({
    samplesToSubmit: [],
    sampleXML: null,
    submissionXML: null,
    showAlert: false,
    showLoginModal: false,
    alert: {
        variant:'',
        message: '',
    },
    user: null,
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
    },
    setField(state, payload){
        state[payload.label] = payload.value
    },
    setAlert(state, payload){
        state.alert = payload
    },
    showAlert(state){
        state.showAlert = true
    },
    hideAlert(state){
        state.showAlert = false
    },
    showLoginModal(state){
        state.showLoginModal = true
    },
    hideLoginModal(state){
        state.showLoginModal = false
    }

}
const actions = {
    reset(context){
        context.commit('resetSamples')
    },
    showAlert(context){
        context.commit('showAlert')
    },
    hideAlert(context){
        context.commit('hideAlert')
    },
    showLoginModal(context){
        console.log(context)
        context.commit('showLoginModal')
    },
    hideLoginModal(context){
        context.commit('hideLoginModal')
    }

}

const getters= {
    getSamplesToSubmit(state){
        return state.samplesToSubmit
    },
    getSampleXML(state){
        return state.sampleXML
    },
    showLoginModal(state){
        return state.showLoginModal
    },
    getAlert(state){
        return state.alert
    },
    getShowAlert(state){
        return state.showAlert
    }

}
export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
    }