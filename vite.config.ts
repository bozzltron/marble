import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps for production
    minify: 'esbuild', // Use esbuild for faster builds
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Three.js into its own chunk for better caching
          'three': ['three']
        }
      }
    }
  },
  base: './' // Use relative paths for deployment flexibility
}); 