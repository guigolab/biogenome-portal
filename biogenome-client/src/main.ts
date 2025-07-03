import { createApp } from 'vue'
import i18n from './i18n'
import { createVuestic } from 'vuestic-ui'
import stores from './stores'
import router from './router'
import App from './App.vue'
import VueMatomo from 'vue-matomo'
import { useAppSettings } from './composable/useApplicationSettings'
import iconsConfig from '../vuestic-ui/icons-config/icons-config'
import { useGlobalStore } from './stores/global-store'

const { fetchSettings, configs } = useAppSettings()

fetchSettings().then(() => {

    const app = createApp(App)

    const trackerPath = import.meta.env.VITE_MATOMO_URL
    const siteId = import.meta.env.VITE_MATOMO_SITE_ID as number ?? 1
    app.use(stores)

    app.provide('appConfig', configs.value);

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

    // Global error handler for uncaught 401 errors
    app.config.errorHandler = (error, instance, info) => {
        console.error('Global error handler:', error, info)
        
        // Check if it's an axios error with 401 status
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as any
            if (axiosError.response && axiosError.response.status === 401) {
                const gStore = useGlobalStore()
                gStore.clearAuthState()
                
                if (router.currentRoute.value.name !== 'login') {
                    router.push('/login')
                }
            }
        }
    }

    app.mount('#app')

    // Handle uncaught promise rejections (like 401 errors)
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason)
        
        // Check if it's an axios error with 401 status
        if (event.reason && typeof event.reason === 'object' && 'response' in event.reason) {
            const axiosError = event.reason as any
            if (axiosError.response && axiosError.response.status === 401) {
                const gStore = useGlobalStore()
                gStore.clearAuthState()
                
                if (router.currentRoute.value.name !== 'login') {
                    router.push('/login')
                }
                
                // Prevent the default error handling
                event.preventDefault()
            }
        }
    })

    if ((window as any)._paq) (window as any)._paq.push(['trackPageView']); //To track pageview

})