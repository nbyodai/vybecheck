import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/server.ts',
    target: 'node22', // Match your Node version
    outDir: 'dist',

    // Important: Don't empty dist, or you'll wipe the frontend build
    emptyOutDir: false,

    rollupOptions: {
      output: {
        // Force the output file name to match your package.json "start" script
        entryFileNames: 'server.js',
        format: 'esm', // Use ES Modules
      },
    },
  },
});
