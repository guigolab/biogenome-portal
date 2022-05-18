import portalService from '../../services/DataPortalService'
import {ROOTNODE, PROJECT_ACCESSION} from '../../utils/static-config'

const getDefaultState = () => ({
    loading: false,
    taxName: ROOTNODE,
    taxNameHistory: [],
    organism: null, 
    option: 'species_name', //default option for filter bar
    filter: null,
    perPage: 20,
    totalRows: 1,
    currentPage: 1,
    tree: null,
    position: '',
    breadcrumbs: [{text: 'Home', to: {name: 'home-page'}}], // home as default
    maxLeaves:90,
    selectedData:[],
    selectedBioproject:PROJECT_ACCESSION,
    onlySelectedData:false,
})
const state = getDefaultState()

const findObj = (arr, nameToFind) => {
    for (const item of arr) {
       if (item.name === nameToFind) return item;
       if (item.children) {
          const recursiveResult = findObj(item.children, nameToFind);
          if (recursiveResult) return recursiveResult;
       }
    }
 };
 
const mutations = {
    setField(state, payload){
        state[payload.label] = payload.value
    },
    setTree(state, payload) {
        portalService.getTaxonChildren(payload.value)
        .then(response => {
            state.tree = response.data
        })
        .catch(()=>{
            state.loading=false
        })
    },
    pushBreadcrumb(state,payload){
        state.breadcrumbs.push({text: payload.text, to: payload.to})
    },
    sliceBreadcrumbs(state,payload){
        const index = payload.index + 1
        state.breadcrumbs = state.breadcrumbs.slice(0,index)
    },
    toggleNode(state,payload){
        const item = state.tree.name === payload.value ? state.tree :  findObj(state.tree.children, payload.value)
        item.isOpen = !item.isOpen
    },
    //save tree browser JSON into state
    assignChildren(state, payload){
        const item = findObj(state.tree.children, payload.label)
        if (item) item.children = payload.value
    },
    showLoading(state){
        state.loading = true
    },
    hideLoading(state){
        state.loading = false
    },
    setMaxNodes(state,payload){
        state.maxLeaves = payload.value
    },
    addTaxNameH(state){
        const index = state.taxNameHistory.indexOf(state.taxName)
        if(state.taxName === ROOTNODE){
            state.taxNameHistory = []
        }
        else if(index === -1){
            state.taxNameHistory.push(state.taxName)
        }
    },
    removeTaxNameH(state, index){
        if (state.taxNameHistory.length > 1){
            state.taxNameHistory = state.taxNameHistory.slice(0, index)
        }else{
            state.taxNameHistory = []
        }
    },
    resetFilters(state){
        Object.assign(state, getDefaultState())
        portalService.getTaxonChildren(ROOTNODE)
        .then(response => {
            state.tree = response.data
        })
        .catch(()=>{
            state.loading=false
        })
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
    },
    getMaxNodes(state){
        return state.maxLeaves
    },
    getSelectedBioproject(state){
        return state.selectedBioproject
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
    resetFilters(context){
        context.commit('resetFilters')
    }

}

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions
    }