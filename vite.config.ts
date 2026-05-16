import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Bumped to 700KB so the konva chunk (~430KB gzip) doesn't keep nagging.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Manual chunking keeps the initial bundle small. The biggest heavy
        // hitters (konva, three.js, animal-island-ui icons) get their own
        // entries so they're only fetched when an actual editor / preview /
        // recognise page is opened. Everything else falls back to vendor.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Order matters: check most specific patterns first.
          if (id.includes('react-konva') || id.includes('/konva/')) return 'vendor-konva';
          if (id.includes('@react-three') || id.includes('/three/')) return 'vendor-three';
          if (id.includes('animal-island-ui') || id.includes('lucide-react')) return 'vendor-ui';
          if (id.includes('i18next')) return 'vendor-i18n';
          if (id.includes('react-router')) return 'vendor-router';
          // Everything else (react, react-dom, scheduler, zustand, qrcode,
          // lz-string, …) goes into one shared vendor chunk.
          return 'vendor';
        },
      },
    },
  },
});
