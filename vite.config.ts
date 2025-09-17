
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Removed lovable-tagger due to Vite peer dependency conflicts

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';
  const isStaging = mode === 'staging';

  return {
    // Environment-specific configuration
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __BUILD_MODE__: JSON.stringify(mode),
    },

    server: {
      host: "::",
      port: 8080,
      // Enable HMR in development
      hmr: isDevelopment,
    },

    plugins: [
      react(),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    optimizeDeps: {
      exclude: ['lucide-react'],
    },

    // Build configuration
    build: {
      // Generate source maps for staging and development
      sourcemap: !isProduction,
      
      // Optimize for production
      minify: isProduction ? 'esbuild' : false,
      
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // Rollup options for better chunking
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['lucide-react', 'react-hot-toast'],
            supabase: ['@supabase/supabase-js'],
            charts: ['chart.js', 'react-chartjs-2'],
            pdf: ['jspdf', 'jszip', 'file-saver'],
          },
        },
      },
    },

    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      // Use test-specific TypeScript configuration
      typecheck: {
        tsconfig: './tsconfig.test.json',
      },
    },

    // Preview configuration for staging
    preview: {
      port: 4173,
      host: true,
    },
  };
});
