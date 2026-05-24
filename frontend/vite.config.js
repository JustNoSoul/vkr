import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Когда React будет делать запрос к /api, Vite перенаправит его на Docker
      '/api': {
        target: 'http://127.0.0.1:8000', // nginx (порт 8000 проброшен в docker-compose)
        changeOrigin: true,
        secure: false,
        // Если твой бэкенд в Docker НЕ ожидает префикс /api в путях (например, ждет просто /components/cpu), 
        // то эта строчка ниже автоматически удалит /api при пересылке:
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})