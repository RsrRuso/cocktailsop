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
        // Auto-update ensures published changes are picked up without relying on users accepting a prompt.
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'robots.txt', 'notification.wav'],
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
        // Cache only small, essential assets.
        // Do NOT precache large JS chunks (they can exceed Workbox limits and break builds/PWA installs).
        globPatterns: ['**/*.{html,css,woff,woff2,webmanifest}'],
        // Exclude large logo files and bulky generated assets from precaching
        globIgnores: ['**/sv-logo*.png', '**/assets/*.png', '**/*.map'],
        // Critical: ensure iOS Home Screen launches on deep links (prevents black screen)
        navigateFallback: '/index.html',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Keep the precache size small to prevent timeouts
        maximumFileSizeToCacheInBytes: 2097152,
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
      "xlsx": path.resolve(__dirname, "./src/vendor/xlsx"),
      "leaflet": path.resolve(__dirname, "./src/vendor/leaflet"),
      "fabric": path.resolve(__dirname, "./src/vendor/fabric"),
    },
  },
  build: {
    minify: 'esbuild',
    target: 'esnext',
    // Huge builds can print thousands of lines (one per chunk) and occasionally time out
    // in CI-like environments. This keeps builds fast and logs small.
    reportCompressedSize: false,
    // Reduce chunk explosion (thousands of tiny route chunks) which can cause slow builds
    // and preview/publish generation timeouts.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Group app code to avoid generating hundreds/thousands of tiny chunks.
          // (React.lazy will still work; multiple lazies can share a single chunk.)
          if (id.includes('src/pages/')) return 'pages';
          if (id.includes('src/modules/')) return 'modules';
          if (id.includes('src/components/') && /Dialog|Drawer|Sheet|Popover|Modal/i.test(id)) {
            return 'overlays';
          }

          // Vendor splitting
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