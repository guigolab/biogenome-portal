import { createApp } from 'vue'
import stores from './stores'
import App from './App.vue'
import PrimeVue from 'primevue/config';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import './assets/tailwind.css'; // Adjust the path if needed
import uiConfig from '../configs/ui.json'
import ToastService from 'primevue/toastservice';
import 'primeicons/primeicons.css'
import router from './router'



const app = createApp(App)

app.use(stores)
app.use(router)

// app.use(router)


const MyPreset = definePreset(Aura, {
    ...uiConfig
    //Your customizations, see the following sections for examples
});
// app.use(i18n)

app.use(PrimeVue, {
    theme: {
        preset: MyPreset,
        options: {
            darkModeSelector: false || 'none',
        }
    }
});

app.use(ToastService);

app.mount('#app')


