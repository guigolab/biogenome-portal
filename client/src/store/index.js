import Vue from 'vue'
import Vuex from 'vuex'
import form from './modules/form'
import submission from './modules/submission'
import portal from './modules/portal'
import createPersistedState from "vuex-persistedstate";

Vue.use(Vuex)

const store = new Vuex.Store({
  plugins: [createPersistedState()],
  modules: {
    form,
    submission,
    portal
  }
})
export default store