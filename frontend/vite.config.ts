import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  optimizeDeps: {
    include: ['@jupyterlab/services'],
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
