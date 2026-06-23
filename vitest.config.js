import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js', 'react-chartjs-2'],
          'search': ['fuse.js'],
        },
      },
    },
  },
});
