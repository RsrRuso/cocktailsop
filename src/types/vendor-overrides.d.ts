// Override type declarations for CDN-loaded vendor modules.
// These modules are loaded from CDN at runtime via src/vendor/* shims.
// We use 'any' types to avoid TypeScript strictness since the actual
// implementation comes from external CDN at runtime.

declare module 'jspdf' {
  const jsPDF: any;
  export default jsPDF;
  export { jsPDF };
}

declare module 'jspdf-autotable' {
  const autoTable: any;
  export default autoTable;
}

declare module 'xlsx' {
  const XLSX: any;
  export const read: any;
  export const utils: any;
  export const write: any;
  export const writeFile: any;
  export default XLSX;
}

// Leaflet namespace for type annotations
declare namespace L {
  type Map = any;
  type Marker = any;
  type LayerGroup = any;
  type LatLng = any;
  type Icon = any;
  type LatLngBounds = any;
}

declare module 'leaflet' {
  const L: any;
  export default L;
}

declare module 'fabric' {
  const fabric: any;
  export const Canvas: any;
  export const Rect: any;
  export const Circle: any;
  export const Triangle: any;
  export const Polygon: any;
  export const Line: any;
  export const Text: any;
  export const FabricObject: any;
  export default fabric;
}

// Type aliases for fabric objects when used as types
type FabricCanvas = any;
type FabricObject = any;

declare module 'leaflet/dist/leaflet.css' {
  const content: any;
  export default content;
}
