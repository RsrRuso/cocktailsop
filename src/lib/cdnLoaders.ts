// CDN loaders for heavy libraries to reduce install footprint

// @ts-ignore - Dynamic CDN imports
const jspdfUrl = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm';
// @ts-ignore - Dynamic CDN imports
const autoTableUrl = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.5/+esm';
// @ts-ignore - Dynamic CDN imports
const xlsxUrl = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';
// @ts-ignore - Dynamic CDN imports
const fabricUrl = 'https://cdn.jsdelivr.net/npm/fabric@6.0.2/+esm';
// @ts-ignore - Dynamic CDN imports
const leafletUrl = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm';

let leafletCSSLoaded = false;

// jsPDF
export async function loadJsPDF(): Promise<any> {
  const mod: any = await (Function('url', 'return import(url)')(jspdfUrl));
  return mod.default || mod.jsPDF || mod;
}

// jsPDF AutoTable plugin
export async function loadAutoTable(): Promise<any> {
  const mod: any = await (Function('url', 'return import(url)')(autoTableUrl));
  return mod.default || mod;
}

// XLSX (SheetJS)
export async function loadXLSX(): Promise<any> {
  const mod: any = await (Function('url', 'return import(url)')(xlsxUrl));
  return mod;
}

// Fabric.js
export async function loadFabric(): Promise<any> {
  const mod: any = await (Function('url', 'return import(url)')(fabricUrl));
  return mod;
}

// Leaflet
export async function loadLeaflet(): Promise<any> {
  // Load CSS once
  if (!leafletCSSLoaded) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    leafletCSSLoaded = true;
  }
  const mod: any = await (Function('url', 'return import(url)')(leafletUrl));
  return mod.default || mod;
}

// Helper to load jsPDF with autoTable already applied
export async function loadJsPDFWithAutoTable(): Promise<{ jsPDF: any; autoTable: any }> {
  const [jsPDF, autoTable] = await Promise.all([loadJsPDF(), loadAutoTable()]);
  return { jsPDF, autoTable };
}
