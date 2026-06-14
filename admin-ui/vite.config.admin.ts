import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/admin/',
  server: { proxy: { '/api': 'http://localhost:8080', '/admin': 'http://localhost:8080' } },
  build: { outDir: 'dist', emptyOutDir: true },
})
