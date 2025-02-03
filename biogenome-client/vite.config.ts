import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import VueI18nPlugin from '@intlify/vite-plugin-vue-i18n'
import { defineConfig, loadEnv } from 'vite'
import pluginRewriteAll from 'vite-plugin-rewrite-all'

function generateBasePath(path: string | undefined) {
  return path ?
    path.endsWith('/') ?
      path
      : path + '/'
    : undefined
}

export default ({ mode }: any) => {
  const env = loadEnv(mode, process.cwd())
  const basePath = generateBasePath(env.VITE_BASE_PATH)

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
