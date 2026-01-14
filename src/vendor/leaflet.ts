// Local shim for `leaflet`.
// Loads from CDN at runtime to keep install footprint small.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynamicImport = (url: string): Promise<any> => (Function('u', 'return import(u)') as any)(url);

const LEAFLET_ESM_URL = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm';

// Load CSS once
const loadCSS = () => {
  if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
};

loadCSS();

const mod: any = await dynamicImport(LEAFLET_ESM_URL);

// Leaflet exports itself as default
const L = mod?.default || mod;

export default L;

