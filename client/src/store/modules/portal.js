import portalService from '../../services/DataPortalService'

const state = () => ({
    loading: false,
    taxName: 'Eukaryota',
    taxNameHistory: [],
    organism: null, //default value for tree browser and d3 tree
    option: 'organisms', //default option for filter bar
    filter: null,
    perPage: 20,
    totalRows: 1,
    currentPage: 1,
    tree: null,
    position: '',
    breadcrumbs: [{text: 'Home', to: {name: 'home-page'}}] // home as default
})

const findObj = (arr, idToFind) => {
    for (const item of arr) {
       if (item.name === idToFind) return item;
       if (item.children) {
          const recursiveResult = findObj(item.children, idToFind);
          if (recursiveResult) return recursiveResult;
       }
    }
 };
 
const mutations = {
    setField(state, payload){
        state[payload.label] = payload.value
    },
    setTree(state,payload) {
        portalService.getTaxonChildren(payload.value)
        .then(response => {
            state.tree = response.data
        })
    },
    pushBreadcrumb(state,payload){
        state.breadcrumbs.push({text: payload.text, to: payload.to})
    },
    sliceBreadcrumbs(state,payload){
        const index = payload.index + 1
        state.breadcrumbs = state.breadcrumbs.slice(0,index)
        // Object.assign(state.breadcrumbs,state.breadcrumbs.slice(0,payload.index+1))
    },
    toggleNode(state,payload){
        const item = state.tree.name === payload.value ? state.tree :  findObj(state.tree.children, payload.value)
        item.isOpen = !item.isOpen
    },
    //save tree browser JSON into state
    assignChildren(state, payload){
        const item = findObj(state.tree.children, payload.label)
        console.log(item)
        item.children = payload.value
    },
    showLoading(state){
        state.loading = true
    },
    hideLoading(state){
        state.loading = false
    },
    addTaxNameH(state){
        const index = state.taxNameHistory.indexOf(state.taxName)
        if(index === -1 && state.taxName !== 'Eukaryota'){
            state.taxNameHistory.push(state.taxName)
        }
    },
    removeTaxNameH(state, index){
        if (state.taxNameHistory.length > 1){
            state.taxNameHistory = state.taxNameHistory.slice(0, index+1)
        }else{
            state.taxNameHistory = []
        }
    }
}
const getters= {
    getState(state){
        return state
    },
    getNode:(state)=>(name)=>{
        return findObj(state.tree.children,name);
    },
    getTaxNameHistory(state){
        return state.taxNameHistory
    }
}
const actions= {
    showLoading(context){
        context.commit('showLoading')
    },
    hideLoading(context){
        context.commit('hideLoading')
    },
    addTaxHistory(context){
        context.commit('addTaxNameH')
    },

}

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions
    }