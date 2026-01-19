import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['wa-sqlite', 'wa-sqlite/dist'],
    esbuildOptions: {
      target: 'esnext',
    },
    commonjsOptions: {
      include: [/base-64/, /text-encoder-lite/, /protobufjs/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    host: '0.0.0.0', // Listen on all interfaces to allow external access
    port: 8084,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Serve WASM files with correct MIME type
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm')
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
        }
        // Also handle .mjs files that might contain WASM imports
        if (req.url?.endsWith('.mjs') && req.url?.includes('wa-sqlite')) {
          res.setHeader('Content-Type', 'application/javascript')
        }
        next()
      })
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      '/photos': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['..']
    }
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})

