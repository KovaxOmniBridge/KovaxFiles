import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: 'electron/main.ts',
        onstart(options) {
          // Iniciar o Electron automaticamente no desenvolvimento
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'fs', 'path', 'os', 'child_process']
            }
          }
        }
      },
      {
        // Preload process entry point
        onstart(options) {
          // Notificar recarregamento quando o preload for alterado
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.cjs'
            },
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
