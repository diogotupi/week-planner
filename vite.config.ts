import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const syncEnabled = process.env.GITHUB_PAGES === 'true' ? 'false' : 'true'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/week-planner/' : '/',
  define: {
    'import.meta.env.VITE_SYNC_ENABLED': JSON.stringify(syncEnabled),
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.dev.html'),
    },
  },
})
