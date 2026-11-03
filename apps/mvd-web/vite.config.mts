/// <reference types='vitest' />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  root:     import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/mvd-web',
  server:   {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react()],
  // A shell with NODE_ENV set to something else ("local") would bundle the development React, several
  // times slower; a build always bundles the production one.
  define:  command === 'build' ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {},
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build:   {
    outDir:               './dist',
    emptyOutDir:          true,
    reportCompressedSize: true,
    commonjsOptions:      {
      transformMixedEsModules: true,
    },
  },
}))
