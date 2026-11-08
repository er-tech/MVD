import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The build goes to the workspace's dist/ (smith), never dist/ in the app.
export default defineConfig({
  plugins: [react()],
  test:    { environment: 'jsdom' },
  build:   {
    outDir:      '../../dist/apps/mvd2-web',
    emptyOutDir: true,
  },
})
