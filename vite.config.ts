import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

export default defineConfig({
  root: 'web',
  base: './',
  plugins: [
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
      emitFile: true,
    }),
  ],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'web/src'),
      '@charts': path.resolve(__dirname, 'web/src/charts'),
      '@aggregations': path.resolve(__dirname, 'web/src/aggregations'),
      '@workers': path.resolve(__dirname, 'web/src/workers'),
      '@utils': path.resolve(__dirname, 'web/src/utils'),
      '@state': path.resolve(__dirname, 'web/src/state'),
      '@i18n': path.resolve(__dirname, 'web/src/i18n'),
      '@types': path.resolve(__dirname, 'web/src/types'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
        },
      },
    },
  },
});
