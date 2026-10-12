import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  server: {
    host: 'localhost',
    port: 4173,
    strictPort: true
  },
  preview: {
    host: 'localhost',
    port: 4173,
    strictPort: true
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})

