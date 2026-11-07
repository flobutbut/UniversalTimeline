import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { seoPlugin } from './scripts/seo-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), seoPlugin()],
  define: { 'import.meta.env.VITE_SEO_INDEXING_ALLOWED': JSON.stringify(process.env.VERCEL_ENV !== 'preview') },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@temporal': path.resolve(__dirname, './server/src/shared/temporal.ts'),
      '@account-rules': path.resolve(__dirname, './server/src/shared/accountRules.ts')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/wikidata': {
        target: 'https://query.wikidata.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wikidata/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'WikidataPeriods/1.0');
          });
          proxy.on('error', (err: Error) => {
            // Log uniquement les erreurs critiques
            if ((err as any).code !== 'ECONNRESET') {
              process.stderr.write(`Proxy Error: ${err.message}\n`);
            }
          });
        }
      },
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: Error) => {
            // Log uniquement les erreurs critiques
            if ((err as any).code !== 'ECONNRESET') {
              process.stderr.write(`Proxy Error: ${err.message}\n`);
            }
          });
        }
      }
    }
  }
})
