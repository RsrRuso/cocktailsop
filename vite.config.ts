import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.png', 'robots.txt', 'notification.wav'],
        // In dev/preview, a Service Worker can cache Vite's module chunks and cause
        // "Importing a module script failed" + blank screens.
        devOptions: {
          enabled: false,
        },
      manifest: {
        name: 'SV',
        short_name: 'SV',
        description: 'Professional operations suite for beverage industry professionals',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/sv-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/sv-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/sv-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Only cache essential small assets, exclude large images
        globPatterns: ['**/*.{js,css,html,woff,woff2}'],
        // Exclude large logo files from precaching
        globIgnores: ['**/sv-logo*.png', '**/assets/*.png'],
        // Critical: ensure iOS Home Screen launches on deep links (prevents black screen)
        navigateFallback: '/index.html',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Limit precache size to prevent timeouts
        maximumFileSizeToCacheInBytes: 500000,
        // IMPORTANT: never cache authenticated API responses (can cause "Load failed" and blank screens)
        runtimeCaching: [],
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Local CDN-backed shims to avoid bundling heavy deps in install step
      "jspdf": path.resolve(__dirname, "./src/vendor/jspdf"),
      "jspdf-autotable": path.resolve(__dirname, "./src/vendor/jspdf-autotable"),
    },
  },
  build: {
    minify: 'esbuild',
    target: 'esnext',
    // Reduce chunk explosion (thousands of tiny icon chunks) which can cause slow builds
    // and preview generation timeouts.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('@tanstack')) return 'tanstack';
          return 'vendor';
        },
      },
    },
  },
}));