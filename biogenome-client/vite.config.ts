import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import VueI18nPlugin from '@intlify/vite-plugin-vue-i18n'
import { defineConfig, loadEnv } from 'vite'
import pluginRewriteAll from 'vite-plugin-rewrite-all'

export default ({ mode }: any) => {
  const env = loadEnv(mode, process.cwd())
  const basePath = env.VITE_BASE_PATH ? env.VITE_BASE_PATH + '/' : undefined

  return defineConfig({
    base: basePath,
    resolve: {
      alias: {
        stream: 'stream-browserify',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
        // Enable esbuild polyfill plugins
        plugins: [
        ],
      },
    },
    build: {
      rollupOptions: {
        plugins: [
        ],
      },
    },
    plugins: [
      vue(),
      pluginRewriteAll(),
      VueI18nPlugin({
        include: resolve(dirname(fileURLToPath(import.meta.url)), './src/i18n/locales/**'),
      }),
    ],
  })
}
