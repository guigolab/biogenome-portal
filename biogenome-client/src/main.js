import { createApp } from 'vue'
import App from './App.vue'
import { createVuestic } from 'vuestic-ui' 
import 'vuestic-ui/dist/vuestic-ui.css'
import {createPinia} from 'pinia'
import router from './router'
import './assets/overrides.css'
import {Layout} from '../config.json'

createApp(App)
.use(createPinia())
.use(createVuestic({
    config:{
        colors:{
            primary: Layout.primary,
            secondary: Layout.secondary,
        }
    }
}))
.use(router)
.mount('#app')
