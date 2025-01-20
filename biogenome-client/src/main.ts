import { createApp } from 'vue'
import i18n from './i18n'
import { createVuestic } from 'vuestic-ui'
import stores from './stores'
import router from './router'
import App from './App.vue'
import VueMatomo from 'vue-matomo'
import { useAppSettings } from './composable/useApplicationSettings'

const {fetchSettings, configs} = useAppSettings()

fetchSettings().then(() => {

    const app = createApp(App)

    const trackerPath = import.meta.env.VITE_MATOMO_URL
    const siteId = import.meta.env.VITE_MATOMO_SITE_ID as number ?? 1

    app.use(stores)

    app.provide('appConfig', configs.value);

    app.use(router)

    if (trackerPath) {
        app.use(VueMatomo, {
            // Configure your matomo server and site by providing
            host: trackerPath,
            siteId,
            router
        })
    }

    app.use(i18n)
    app.use(createVuestic())

    app.mount('#app')

    console.log('HELLo')
    if (window._paq) window._paq.push(['trackPageView']); //To track pageview
})


//     (async () => {
//         try {

//         } catch (e) {
//             console.error('Failed to load app configuration. Exiting...');
//         }
//     })

// const { data } = await ConfigService.getConfig()

