import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

const webRoot = path.resolve(__dirname, 'web');
const shouldAnalyze = String(process.env.ANALYZE || '').toLowerCase() === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isGitHubActions = String(process.env.GITHUB_ACTIONS || '').toLowerCase() === 'true';
const basePath = isGitHubActions && repoName ? `/${repoName}/` : './';

const plugins: import('vite').PluginOption[] = [];

if (shouldAnalyze) {
  plugins.push(
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
      emitFile: true,
    })
  );
}

export default defineConfig({
  root: 'web',
  base: basePath,
  plugins,
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
      input: {
        main: path.resolve(webRoot, 'index.html'),
        starMap: path.resolve(webRoot, 'star-map.html'),
      },
      output: {
        manualChunks: {
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
        },
      },
    },
  },
});
