import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'chart';
          }
          if (id.includes('fuse.js')) {
            return 'search';
          }
        },
      },
    },
  },
})

