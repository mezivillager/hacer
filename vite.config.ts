import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@gates': path.resolve(__dirname, './src/gates'),
      '@store': path.resolve(__dirname, './src/store'),
      '@simulation': path.resolve(__dirname, './src/simulation'),
    },
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
})
