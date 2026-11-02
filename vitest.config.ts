import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), '@temporal': fileURLToPath(new URL('./server/src/shared/temporal.ts', import.meta.url)), '@account-rules': fileURLToPath(new URL('./server/src/shared/accountRules.ts', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'server/test/**/*.test.ts'],
    // Tests must not depend on the developer's .env.local: no audience tracker (nor banner) unless a test stubs it.
    env: { VITE_ANALYTICS_PROVIDER: '', VITE_POSTHOG_PROJECT_TOKEN: '', VITE_POSTHOG_HOST: '' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/main.ts',
        'src/App.vue',
      ],
    },
  },
}); 