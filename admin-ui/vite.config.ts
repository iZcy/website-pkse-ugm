import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080', '/admin': 'http://localhost:8080' } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'index.html'),
        member: resolve(__dirname, 'member.html'),
        rapor: resolve(__dirname, 'rapor.html'),
        login: resolve(__dirname, 'login-entry.html'),
      },
    },
  },
})
