import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // DOMPurify needs a DOM to sanitize HTML
    environment: 'jsdom',
  },
})
