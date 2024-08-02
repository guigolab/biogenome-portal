import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import VueI18nPlugin from '@intlify/vite-plugin-vue-i18n'
import { defineConfig, loadEnv } from 'vite'
import cesium from 'vite-plugin-cesium'
import pluginRewriteAll from 'vite-plugin-rewrite-all'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  // import.meta.env.VITE_NAME available here with: process.env.VITE_NAME
  // import.meta.env.VITE_PORT available here with: process.env.VITE_PORT
  const basePath = env.VITE_BASE_PATH ? env.VITE_BASE_PATH + '/': undefined
  console.log(basePath)
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
          // NodeGlobalsPolyfillPlugin({
          //   process: true,
          //   buffer: true,
          // }),
          // NodeModulesPolyfillPlugin(),
        ],
      },
    },
    build: {
      rollupOptions: {
        plugins: [
          // Enable rollup polyfills plugin
          // used during production bundling
          // rollupNodePolyFill(),
        ],
      },
    },
    plugins: [
      vue(),
      cesium(),
      pluginRewriteAll(),
      VueI18nPlugin({
        include: resolve(dirname(fileURLToPath(import.meta.url)), './src/i18n/locales/**'),
      }),
    ],
  })
}
