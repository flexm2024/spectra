/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3030,
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/tests/setup.ts'],
    globals: true,
  },
})
