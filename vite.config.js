import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    // 允許 Zeabur / sandbox 等任何反向代理 host 進來
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
