import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/member/',
  build: {
    outDir: 'dist-member',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: resolve(__dirname, 'member.html') },
    },
  },
})
