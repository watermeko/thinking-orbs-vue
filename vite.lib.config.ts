import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Library build: `thinking-orbs-vue` (component) + `thinking-orbs-vue/engine`
// (Vue-free geometry surface, same split as the upstream package).
export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src/lib'],
      tsconfigPath: './tsconfig.lib.json',
      // two entry points, so types are emitted per-file rather than rolled
      // into a single index.d.ts
      rollupTypes: false,
      outDir: 'dist-lib'
    })
  ],
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    // Left readable: the geometry is meant to be inspected, and consumers
    // minify their own bundles anyway.
    minify: false,
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/lib/index.ts', import.meta.url)),
        engine: fileURLToPath(new URL('./src/lib/engine/index.ts', import.meta.url))
      },
      name: 'ThinkingOrbsVue',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => (format === 'es' ? `${entryName}.js` : `${entryName}.cjs`)
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' }
      }
    }
  }
});
