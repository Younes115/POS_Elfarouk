import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isServe = command === 'serve'
  const isBuild = command === 'build'

  return {
    plugins: [
      react(),

      // ── Electron Main + Preload ──────────────
      electron({
        main: {
          entry: 'src/main/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              sourcemap: isServe ? 'inline' : false,
              minify: isBuild,
              rollupOptions: {
                external: ['electron', '@prisma/client'],
                output: {
                  format: 'cjs',
                },
              },
            },
          },
        },
        preload: {
          input: 'src/main/preload.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              sourcemap: isServe ? 'inline' : false,
              minify: isBuild,
              rollupOptions: {
                external: ['electron'],
                output: {
                  format: 'cjs',
                },
              },
            },
          },
        },
      }),
    ],

    base: './', // Important for Electron: use relative paths for assets

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@main': path.resolve(__dirname, './src/main'),
      },
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },

    server: {
      port: 5173,
      strictPort: true,
    },
  }
})
