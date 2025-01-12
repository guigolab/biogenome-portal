import { createApp } from 'vue'
import { createVuestic } from 'vuestic-ui'
import stores from './stores'
import router from './router'
import App from './App.vue'
import "vuestic-ui/dist/styles/index.css";

const app = createApp(App)

app.use(stores)
app.use(router)

app.use(createVuestic())

app.mount('#app')
