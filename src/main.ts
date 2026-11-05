import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { installAccessGuard } from './router/access'
import { useAuthStore } from './stores/useAuthStore'
import { useConsentStore } from './stores/useConsentStore'
import { installAnalytics } from './lib/analytics'
import { installVisitCounting } from './lib/visitCounting'

const app = createApp(App)
app.use(createPinia())
installAnalytics(useConsentStore())
installVisitCounting()
installAccessGuard(router, useAuthStore())
app.use(router)
app.mount('#app')
