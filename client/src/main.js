import Vue from 'vue'
import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import {LayoutPlugin, ModalPlugin} from 'bootstrap-vue'
import store from './store'

Vue.use(LayoutPlugin)
Vue.use(ModalPlugin)

// Vue.config.productionTip = false

new Vue({
  store,
  router,
  render: h => h(App),
}).$mount('#app')


router.beforeEach((to, from, next) => {
  console.log(from)
  if(to.name){
    store.commit('portal/setField',{value: true, label: 'loading'})
  }
    next()
})

router.afterEach(() => {
  store.commit('portal/setField',{value: false, label: 'loading'})
})