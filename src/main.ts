import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { installAccessGuard } from './router/access'
import { useAuthStore } from './stores/useAuthStore'
import { useConsentStore } from './stores/useConsentStore'
import { installAnalytics } from './lib/analytics'
import { installVercelAnalytics } from './lib/vercelAnalytics'

const app = createApp(App)
app.use(createPinia())
installAnalytics(useConsentStore())
installVercelAnalytics()
installAccessGuard(router, useAuthStore())
app.use(router)
app.mount('#app')
