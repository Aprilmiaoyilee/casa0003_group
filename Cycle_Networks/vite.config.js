import { defineConfig } from 'vite';

export default defineConfig({
  // 1) Point Vite’s publicDir to your external data/ folder
  publicDir: '../data',

  // 2) Allow the dev server to read files above your project root
  server: {
    fs: {
      // allow serving files from one level up
      allow: ['..']
    }
  },

  // (keep your other settings here)
  esbuild: {
    supported: { 'top-level-await': true }
  },
  base: '',
});
