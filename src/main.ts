import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { installAccessGuard } from './router/access'
import { useAuthStore } from './stores/useAuthStore'

const app = createApp(App)
app.use(createPinia())
installAccessGuard(router, useAuthStore())
app.use(router)
app.mount('#app')
