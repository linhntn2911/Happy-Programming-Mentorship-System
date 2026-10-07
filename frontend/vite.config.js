import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/oauth2': { target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true },
      '/login/oauth2': { target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true },
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
});
