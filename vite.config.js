import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        proxy: {
            '/api/wikidata': {
                target: 'https://query.wikidata.org',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api\/wikidata/, ''); },
                configure: function (proxy) {
                    proxy.on('proxyReq', function (proxyReq) {
                        proxyReq.setHeader('User-Agent', 'WikidataPeriods/1.0');
                    });
                    proxy.on('error', function (err) {
                        // Log uniquement les erreurs critiques
                        if (err.code !== 'ECONNRESET') {
                            process.stderr.write("Proxy Error: ".concat(err.message, "\n"));
                        }
                    });
                }
            },
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                configure: function (proxy) {
                    proxy.on('error', function (err) {
                        // Log uniquement les erreurs critiques
                        if (err.code !== 'ECONNRESET') {
                            process.stderr.write("Proxy Error: ".concat(err.message, "\n"));
                        }
                    });
                }
            }
        }
    }
});
