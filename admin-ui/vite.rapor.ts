import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/rapor/',
  build: {
    outDir: 'dist-rapor',
    emptyOutDir: true,
    rollupOptions: { input: { main: resolve(__dirname, 'rapor.html') } },
  },
})
