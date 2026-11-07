import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { installAccessGuard } from './router/access'
import { useAuthStore } from './stores/useAuthStore'
import { useConsentStore } from './stores/useConsentStore'
import { installAnalytics } from './lib/analytics'
import { installVisitCounting } from './lib/visitCounting'
import { useDataStore } from './stores/useDataStore'
import { installSeo } from './seo/installSeo'

const app = createApp(App)
app.use(createPinia())
const consent = useConsentStore()
const auth = useAuthStore()
// The publisher's own visits: a device where an administrator signs in is excluded from every measurement.
watch(() => auth.isAdmin, admin => { if (admin) consent.markInternalDevice() }, { immediate: true })
installAnalytics(consent)
installVisitCounting(() => consent.anonymousAllowed)
installAccessGuard(router, auth)
app.use(router)
installSeo(router, useDataStore(), import.meta.env.PROD && import.meta.env.VITE_SEO_INDEXING_ALLOWED !== false)
app.mount('#app')
