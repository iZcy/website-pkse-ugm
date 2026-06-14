import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/rapor/',
  build: {
    outDir: 'dist-rapor',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: resolve(__dirname, 'rapor.html') },
    },
  },
})
