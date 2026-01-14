// Minimal TS module declarations for local Vite aliases.
// These keep the editor/typecheck happy even though we load via CDN at runtime.

declare module 'jspdf' {
  const jsPDF: any;
  export = jsPDF;
}

declare module 'jspdf-autotable' {
  const autoTable: any;
  export default autoTable;
}

declare module 'xlsx' {
  export const read: any;
  export const utils: any;
  export const write: any;
  export const writeFile: any;
  const XLSX: any;
  export default XLSX;
}

declare namespace L {
  const Map: any;
  const Marker: any;
  const LayerGroup: any;
  const LatLng: any;
  const Icon: any;
  const control: any;
  function map(element: any, options?: any): any;
  function marker(latlng: any, options?: any): any;
  function tileLayer(urlTemplate: string, options?: any): any;
  function layerGroup(layers?: any[]): any;
  function divIcon(options?: any): any;
  function icon(options?: any): any;
  function latLng(lat: number, lng: number): any;
  function latLngBounds(corner1: any, corner2: any): any;
  function circleMarker(latlng: any, options?: any): any;
  function circle(latlng: any, options?: any): any;
  function popup(options?: any): any;
}

declare module 'leaflet' {
  export = L;
}

declare module 'fabric' {
  export const Canvas: any;
  export const Rect: any;
  export const Circle: any;
  export const Triangle: any;
  export const Polygon: any;
  export const Line: any;
  export const Text: any;
  export const FabricObject: any;
  export const fabric: any;
}

declare module 'leaflet/dist/leaflet.css' {
  const content: any;
  export default content;
}
