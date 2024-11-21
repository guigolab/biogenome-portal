import { createApp } from 'vue'
import i18n from './i18n'
import { createVuestic } from 'vuestic-ui'
import { createGtm } from '@gtm-support/vue-gtm'
import stores from './stores'
import router from './router'
import App from './App.vue'
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';


const app = createApp(App)

app.use(stores)
app.use(router)

app.use(i18n)
app.use(createVuestic())

if (import.meta.env.VITE_APP_GTM_ENABLED) {
  app.use(
    createGtm({
      id: import.meta.env.VITE_APP_GTM_KEY,
      debug: false,
      vueRouter: router,
    }),
  )
}
app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
});
app.mount('#app')
