import { createApp } from 'vue'
import i18n from './i18n'
import { createVuestic } from 'vuestic-ui'
import stores from './stores'
import router from './router'
import App from './App.vue'
import VueMatomo from 'vue-matomo'
import { useAppSettings } from './composable/useApplicationSettings'
import iconsConfig from '../vuestic-ui/icons-config/icons-config'

const { fetchSettings, configs } = useAppSettings()

fetchSettings().then(() => {

    const app = createApp(App)

    const trackerPath = import.meta.env.VITE_MATOMO_URL
    const siteId = import.meta.env.VITE_MATOMO_SITE_ID as number ?? 1
    app.use(stores)

    app.provide('appConfig', configs.value);


    console.log(configs.value?.ui)
    if (trackerPath) {
        app.use(VueMatomo, {
            // Configure your matomo server and site by providing
            host: trackerPath,
            requireConsent: false,
            siteId,
            router
        })
    }

    app.use(router)

    app.use(i18n)
    app.use(createVuestic({ config: { icons: iconsConfig, ...configs.value?.ui } }))

    app.mount('#app')

    if (window._paq) window._paq.push(['trackPageView']); //To track pageview

})