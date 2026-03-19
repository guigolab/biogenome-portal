import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import VueI18nPlugin from '@intlify/vite-plugin-vue-i18n'
import { defineConfig, loadEnv } from 'vite'
import pluginRewriteAll from 'vite-plugin-rewrite-all'

function generateBasePath(path: string | undefined) {
   return path ? (path.endsWith('/') ? path : path + '/') : undefined
}

export default ({ mode }: any) => {
   const env = loadEnv(mode, process.cwd())
   const basePath = generateBasePath(env.VITE_BASE_PATH)
   const devApiTarget = 'https://dades.biogenoma.cat'
   const isDev = mode === 'development'

   const proxyConfig: Record<string, { target: string; changeOrigin: boolean; rewrite?: (path: string) => string }> = {}
   if (isDev && devApiTarget) {
      const target = devApiTarget.replace(/\/+$/, '')
      proxyConfig['/api'] = { target, changeOrigin: true }
      if (basePath) {
         const apiPrefix = basePath.replace(/\/+$/, '') + '/api'
         proxyConfig[apiPrefix] = {
            target,
            changeOrigin: true,
            rewrite: (path) => path.replace(new RegExp(`^${apiPrefix.replace(/\//g, '\\/')}`), '/api'),
         }
      }
   }

   return defineConfig({
      base: basePath,
      define: {
         // Vue 3 ESM build expects these feature flags from the bundler (see https://link.vuejs.org/feature-flags)
         __VUE_OPTIONS_API__: true,
         __VUE_PROD_DEVTOOLS__: false,
         __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      },
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
            plugins: [],
         },
      },
      build: {
         rollupOptions: {
            plugins: [],
         },
      },
      server: {
         proxy: Object.keys(proxyConfig).length ? proxyConfig : undefined,
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
