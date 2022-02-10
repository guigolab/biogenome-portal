import Vue from 'vue'
import App from './App.vue'
import router from './utils/router'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import {LayoutPlugin, ModalPlugin} from 'bootstrap-vue'
import store from './store'
// import submission from './store/modules/submission'

Vue.use(LayoutPlugin)
Vue.use(ModalPlugin)

// Vue.config.productionTip = false

new Vue({
  store,
  router,
  render: h => h(App),
}).$mount('#app')


router.beforeEach((to, from, next) => {
  if(to.name){
    store.dispatch('portal/showLoading')
  }
    next()
})

router.afterEach(() => {
  store.dispatch('portal/hideLoading')
})